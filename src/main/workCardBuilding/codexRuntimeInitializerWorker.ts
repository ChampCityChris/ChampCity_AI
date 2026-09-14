import { initializeManagedCodexRuntime } from "./codexRuntimeInitialization";
import { createCodexRuntimeOperations } from "./codexRuntimeOperations";
import {
  codexRuntimeInitializerProtocolVersion,
  isCodexRuntimeInitializerRequest,
  type CodexRuntimeInitializeRequest,
  type CodexRuntimeInitializationFailure,
  type CodexRuntimeInitializationSuccess,
} from "./codexRuntimeInitializerProtocol";

const controlPort = process.parentPort;
if (!controlPort) {
  throw new Error("Managed Codex initializer requires an Electron utility-process parent port.");
}

process.on("unhandledRejection", () => process.exit(1));

let started = false;
let shuttingDown = false;
let operations: ReturnType<typeof createCodexRuntimeOperations> | null = null;

controlPort.on("message", (event) => {
  const message = event.data as unknown;
  if (!isCodexRuntimeInitializerRequest(message)) {
    return;
  }
  if (message.kind === "shutdown") {
    void shutdownWorker();
    return;
  }
  if (started || shuttingDown) {
    respondFailure();
    return;
  }
  started = true;
  void runInitialization(message);
});

async function runInitialization(request: CodexRuntimeInitializeRequest): Promise<void> {
  try {
    operations = createCodexRuntimeOperations(request.userDataRoot);
    const result = await initializeManagedCodexRuntime(operations);
    if (!shuttingDown) {
      const response: CodexRuntimeInitializationSuccess = {
        protocolVersion: codexRuntimeInitializerProtocolVersion,
        kind: "success",
        workerProcessId: process.pid,
        result,
      };
      controlPort.postMessage(response);
    }
  } catch {
    if (!shuttingDown) {
      respondFailure();
    }
  } finally {
    await operations?.shutdown?.().catch(() => undefined);
    setImmediate(() => process.exit(0));
  }
}

async function shutdownWorker(): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  await operations?.shutdown?.().catch(() => undefined);
  setImmediate(() => process.exit(0));
}

function respondFailure(): void {
  const response: CodexRuntimeInitializationFailure = {
    protocolVersion: codexRuntimeInitializerProtocolVersion,
    kind: "failure",
    workerProcessId: process.pid,
    error: {
      code: "CODEX_RUNTIME_INITIALIZER_FAILED",
      message: "Managed Codex initialization failed in the utility worker.",
    },
  };
  controlPort.postMessage(response);
}
