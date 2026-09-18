// Explicit read-only dogfood helper. Not part of automated credential-free tests.
const path = require("node:path");
const { createGithubRuntimeOperations } = require("../../dist/main/externalProviders/githubRuntime.js");
const { GithubProviderService, createGithubGateway } = require("../../dist/main/externalProviders/githubProviderService.js");
const { githubResultData } = require("../../dist/main/externalProviders/githubProviderAdapter.js");

async function main() {
  if (!process.env.LOCALAPPDATA) throw new Error("Application data directory unavailable.");
  const runtime = createGithubRuntimeOperations(path.join(process.env.LOCALAPPDATA, "ChampCityAI", "remote02-provider-evidence"));
  if (process.argv.includes("--runtime-probe")) {
    const signal = new AbortController().signal;
    const candidate = await runtime.stage(signal);
    console.log("Official archive integrity and extraction: passed");
    await runtime.probe(candidate, signal);
    console.log(`Official executable version probe: ${candidate.version}`);
    // Never promote from version-only evidence; the live path also requires OAuth/discovery.
    return;
  }
  if (!process.argv.includes("--live-read")) throw new Error("Select runtime probe or live read mode.");
  const service = new GithubProviderService({ runtime, createGateway(candidate) {
    const gateway = createGithubGateway(candidate);
    if (process.argv.includes("--diagnostics")) {
      const invoke = gateway.invokeCapability.bind(gateway);
      gateway.invokeCapability = async (...args) => {
        try {
          const receipt = await invoke(...args);
          if (args[1] === "github.release.read" || args[1] === "github.tag.read") {
            const data = githubResultData(receipt.result);
            console.log(JSON.stringify({ diagnostic: "read-shape", parsed: data !== null, tagMatches: data?.tag_name === args[2].tag, nameMatches: data?.name === args[2].tag, truncated: receipt.result?.truncated === true }));
          }
          return receipt;
        } catch (error) {
          console.log(JSON.stringify({ diagnostic: "gateway-failure", kind: ["malformed-result", "provider-error", "capability-unavailable", "timeout", "authentication-required"].includes(error.kind) ? error.kind : "unavailable" }));
          throw error;
        }
      };
    }
    return gateway;
  } });
  const timer = setInterval(() => {
    const status = service.getStatus();
    console.log(JSON.stringify({ runtime: status.runtime, authentication: status.authentication }));
  }, 15_000);
  try {
    await service.connect();
    const status = service.getStatus();
    console.log(JSON.stringify(status));
    if (status.runtime !== "ready") { process.exitCode = 2; return; }
    for (const request of [{ kind: "context" }, { kind: "repository" }, { kind: "releases" }]) {
      const receipt = await service.read(process.cwd(), request);
      console.log(JSON.stringify({ operation: request.kind, providerId: receipt.providerId, toolName: receipt.toolName, generation: receipt.capabilityGeneration, succeeded: true }));
      if (request.kind === "releases") {
        const tag = receipt.data.find((release) => release.draft === false)?.tag_name;
        if (typeof tag === "string") {
          for (const kind of ["release", "tag"]) {
            const detail = await service.read(process.cwd(), { kind, tag });
            console.log(JSON.stringify({ operation: kind, providerId: detail.providerId, toolName: detail.toolName, generation: detail.capabilityGeneration, succeeded: true }));
          }
        } else console.log("Release/tag detail reads skipped: the bound repository has no returned published release.");
      }
    }
  } finally { clearInterval(timer); await service.disconnect(); }
}

main().catch(() => { console.error("Official GitHub provider dogfood failed; no provider stderr or authentication material was emitted."); process.exitCode = 1; });
