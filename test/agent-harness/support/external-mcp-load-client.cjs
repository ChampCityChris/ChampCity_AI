const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const externalLoadMode = process.env.CHAMPCITY_TEST_EXTERNAL_MCP_LOAD_CLIENT === "true";

if (externalLoadMode) {
  void runExternalMcpLoadClient().catch((error) => failExternalMcpLoadClient(error));
}

async function runExternalMcpLoadClient() {
  const endpoint = process.env.CHAMPCITY_TEST_MCP_ENDPOINT;
  const descriptorPath = process.env.CHAMPCITY_TEST_EXTERNAL_MCP_LOAD_DESCRIPTOR;
  const desktopProcessId = Number(process.env.CHAMPCITY_TEST_DESKTOP_PROCESS_ID);
  if (!endpoint || !descriptorPath || !Number.isInteger(desktopProcessId) || desktopProcessId <= 0) {
    throw new Error("External MCP load client requires its endpoint, descriptor, and Desktop process identity.");
  }
  if (typeof process.send !== "function") {
    throw new Error("External MCP load client requires a test-owned IPC channel.");
  }

  writeLoadDescriptor(descriptorPath, desktopProcessId);
  const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
  const { StreamableHTTPClientTransport } = require(
    "@modelcontextprotocol/sdk/client/streamableHttp.js"
  );
  const mcpClient = new Client({
    name: "champcity-agent-harness-external-desktop-heartbeat-load-test",
    version: "0.1.0",
  }, { capabilities: {} });
  let shuttingDown = false;

  const shutdown = async (exitCode, requestId = null) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    clearTimeout(fallback);
    let clientClosed = false;
    let closeError = null;
    try {
      await mcpClient.close();
      clientClosed = true;
    } catch (error) {
      closeError = error instanceof Error ? error.message : String(error);
    }
    if (process.connected) {
      process.send({
        type: "closed",
        requestId,
        mcpLoadClientProcessId: process.pid,
        clientClosed,
        closeError,
      });
      process.disconnect();
    }
    process.exitCode = exitCode;
  };

  const fallback = setTimeout(() => {
    void shutdown(1);
  }, 45_000);

  process.once("disconnect", () => {
    void shutdown(0);
  });
  process.on("message", (message) => {
    if (!message || typeof message !== "object") {
      return;
    }
    if (message.type === "search") {
      void runSearch(mcpClient, message.requestId).catch((error) => {
        void failExternalMcpLoadClient(error, message.requestId, shutdown);
      });
      return;
    }
    if (message.type === "close") {
      void shutdown(0, message.requestId);
    }
  });

  await mcpClient.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
  process.send({ type: "ready", mcpLoadClientProcessId: process.pid });
}

async function runSearch(mcpClient, requestId) {
  const result = await mcpClient.callTool({
    name: "repo_toolbox",
    arguments: {
      workspaceId: "project_a",
      action: "search_files",
      params: {
        directory: "bulk",
        query: "desktop-main-isolation-target",
        maxResults: 1,
      },
    },
  });
  const ok = result.structuredContent?.ok === true;
  const matchCount = Array.isArray(result.structuredContent?.payload?.matches)
    ? result.structuredContent.payload.matches.length
    : null;
  process.send({
    type: "search-result",
    requestId,
    mcpLoadClientProcessId: process.pid,
    ok,
    matchCount,
  });
}

function writeLoadDescriptor(descriptorPath, desktopProcessId) {
  fs.mkdirSync(path.dirname(descriptorPath), { recursive: true });
  const temporaryPath = `${descriptorPath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify({
    kind: "champcity-test-external-mcp-load-client",
    mcpLoadClientProcessId: process.pid,
    desktopProcessId,
  }), "utf8");
  fs.renameSync(temporaryPath, descriptorPath);
}

async function failExternalMcpLoadClient(error, requestId = null, shutdown = null) {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`${message}\n`);
  if (process.connected) {
    process.send({
      type: "fatal",
      requestId,
      mcpLoadClientProcessId: process.pid,
      message,
    });
  }
  if (shutdown) {
    await shutdown(1, requestId);
    return;
  }
  process.exitCode = 1;
  if (process.connected) {
    process.disconnect();
  }
}

// Shared owner-side coordination; importing this module never starts an MCP client.
module.exports = { startExternalMcpLoadClient };

async function startExternalMcpLoadClient({ repositoryRoot, userDataRoot, mcpEndpoint }) {
  const descriptorPath = path.join(
    userDataRoot,
    "agent-harness",
    "external-mcp-load-client.json",
  );
  const environment = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    CHAMPCITY_TEST_EXTERNAL_MCP_LOAD_CLIENT: "true",
    CHAMPCITY_TEST_MCP_ENDPOINT: mcpEndpoint,
    CHAMPCITY_TEST_EXTERNAL_MCP_LOAD_DESCRIPTOR: descriptorPath,
    CHAMPCITY_TEST_DESKTOP_PROCESS_ID: String(process.pid),
  };
  const child = spawn(
    process.execPath,
    [path.join(repositoryRoot, "test", "agent-harness", "support", "external-mcp-load-client.cjs")],
    {
      cwd: repositoryRoot,
      env: environment,
      stdio: ["ignore", "pipe", "pipe", "ipc"],
      windowsHide: true,
    },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const output = () => ({ stdout, stderr });

  try {
    const ready = await waitForExternalMcpLoadMessage(child, "ready", null, 15_000, output);
    assert.equal(ready.mcpLoadClientProcessId, child.pid);
  } catch (error) {
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      child.kill();
      await waitForExternalMcpLoadExit(child, 5_000);
    }
    throw error;
  }

  return {
    processId: child.pid,
    search: async (requestId) => {
      return waitForExternalMcpLoadMessage(
        child,
        "search-result",
        requestId,
        30_000,
        output,
        { type: "search", requestId },
      );
    },
    close: () => closeExternalMcpLoadClient(child, output),
  };
}

async function closeExternalMcpLoadClient(child, output) {
  const cleanupErrors = [];
  let closeResult = null;
  let forcedTermination = false;
  if (child.exitCode === null && child.signalCode === null && child.connected) {
    const requestId = `close-${Date.now()}`;
    try {
      closeResult = await waitForExternalMcpLoadMessage(
        child,
        "closed",
        requestId,
        10_000,
        output,
        { type: "close", requestId },
      );
    } catch (error) {
      cleanupErrors.push(error instanceof Error ? error.message : String(error));
    }
  }
  let processExited = await waitForExternalMcpLoadExit(child, 10_000);
  if (!processExited && child.pid) {
    child.kill();
    forcedTermination = true;
    processExited = await waitForExternalMcpLoadExit(child, 5_000);
  }
  return {
    clientClosed: closeResult?.clientClosed === true,
    closeError: closeResult?.closeError ?? null,
    processExited,
    exitCode: child.exitCode,
    signalCode: child.signalCode,
    forcedTermination,
    cleanupErrors,
  };
}

function waitForExternalMcpLoadMessage(child, type, requestId, timeoutMs, output, outboundMessage = null) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      const captured = output();
      reject(new Error(`External MCP load client timed out waiting for ${type}.\n${captured.stderr}\n${captured.stdout}`));
    }, timeoutMs);
    const onMessage = (message) => {
      if (message?.type === "fatal") {
        cleanup();
        reject(new Error(`External MCP load client failed: ${message.message}`));
        return;
      }
      if (message?.type === type && (requestId === null || message.requestId === requestId)) {
        cleanup();
        resolve(message);
      }
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onExit = (code, signal) => {
      cleanup();
      const captured = output();
      reject(new Error(
        `External MCP load client exited before ${type} (code ${code}, signal ${signal}).\n${captured.stderr}\n${captured.stdout}`,
      ));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      child.off("message", onMessage);
      child.off("error", onError);
      child.off("exit", onExit);
    };
    child.on("message", onMessage);
    child.once("error", onError);
    child.once("exit", onExit);
    if (outboundMessage) {
      child.send(outboundMessage, (error) => {
        if (error) {
          cleanup();
          reject(error);
        }
      });
    }
  });
}

function waitForExternalMcpLoadExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      child.off("exit", onExit);
      resolve(false);
    }, timeoutMs);
    const onExit = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    child.once("exit", onExit);
  });
}
