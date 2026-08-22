import fs from "node:fs";
import path from "node:path";
import type {
  DevelopmentEnvironmentRequirement,
  DevelopmentEnvironmentProviderAttempt,
} from "../../shared/developmentEnvironmentContracts";

export interface RepositoryEcosystemProvider {
  ecosystem: string;
  evidencePath: string;
  restoreCommand: string[];
  requiredSystemTool: string;
}

interface EcosystemRule {
  ecosystem: string;
  evidence: string[];
  restoreCommand: (workspaceRoot: string, evidencePath: string) => string[];
  requiredSystemTool: string;
}

const ecosystemRules: EcosystemRule[] = [
  { ecosystem: "npm", evidence: ["package-lock.json"], restoreCommand: () => ["npm", "ci"], requiredSystemTool: "nodejs-lts" },
  { ecosystem: "pnpm", evidence: ["pnpm-lock.yaml"], restoreCommand: () => ["pnpm", "install", "--frozen-lockfile"], requiredSystemTool: "nodejs-lts" },
  { ecosystem: "yarn", evidence: ["yarn.lock"], restoreCommand: () => ["yarn", "install", "--immutable"], requiredSystemTool: "nodejs-lts" },
  { ecosystem: "uv-python", evidence: ["uv.lock"], restoreCommand: () => ["uv", "sync"], requiredSystemTool: "uv" },
  { ecosystem: "python-requirements", evidence: ["requirements.txt", "requirements-dev.txt"], restoreCommand: (_root, evidencePath) => ["python", "-m", "pip", "install", "-r", evidencePath], requiredSystemTool: "python" },
  { ecosystem: "cargo", evidence: ["Cargo.lock", "Cargo.toml"], restoreCommand: () => ["cargo", "fetch"], requiredSystemTool: "rust" },
  { ecosystem: "go-modules", evidence: ["go.sum", "go.mod"], restoreCommand: () => ["go", "mod", "download"], requiredSystemTool: "go" },
  { ecosystem: "dotnet", evidence: ["*.sln", "*.csproj"], restoreCommand: () => ["dotnet", "restore"], requiredSystemTool: "dotnet-sdk" },
  { ecosystem: "maven", evidence: ["mvnw", "pom.xml"], restoreCommand: (workspaceRoot) => [mavenExecutable(workspaceRoot), "dependency:go-offline"], requiredSystemTool: "maven" },
  { ecosystem: "gradle", evidence: ["gradlew", "build.gradle", "build.gradle.kts"], restoreCommand: (workspaceRoot) => [gradleExecutable(workspaceRoot), "dependencies"], requiredSystemTool: "jdk" },
  { ecosystem: "vcpkg", evidence: ["vcpkg.json"], restoreCommand: () => ["vcpkg", "install"], requiredSystemTool: "vcpkg" },
  { ecosystem: "conan", evidence: ["conanfile.py", "conanfile.txt"], restoreCommand: () => ["conan", "install", "."], requiredSystemTool: "conan" },
  { ecosystem: "bundler", evidence: ["Gemfile.lock", "Gemfile"], restoreCommand: () => ["bundle", "install"], requiredSystemTool: "ruby" },
  { ecosystem: "composer", evidence: ["composer.lock", "composer.json"], restoreCommand: () => ["composer", "install"], requiredSystemTool: "composer" },
];

export function detectRepositoryEcosystemProviders(workspaceRoot: string): RepositoryEcosystemProvider[] {
  return ecosystemRules.flatMap((rule) => {
    const evidencePath = rule.evidence
      .map((pattern) => findEvidencePath(workspaceRoot, pattern))
      .find((candidate): candidate is string => Boolean(candidate));
    if (!evidencePath) {
      return [];
    }
    return [{
      ecosystem: rule.ecosystem,
      evidencePath,
      restoreCommand: rule.restoreCommand(workspaceRoot, evidencePath),
      requiredSystemTool: rule.requiredSystemTool,
    }];
  });
}

export function managedRequirementsForRepositoryEcosystemTools(
  providers: RepositoryEcosystemProvider[],
): DevelopmentEnvironmentRequirement[] {
  const seen = new Set<string>();
  return providers.flatMap((provider) => {
    if (seen.has(provider.requiredSystemTool)) {
      return [];
    }
    seen.add(provider.requiredSystemTool);
    return [{
      capabilityId: provider.requiredSystemTool,
      provisioning: "managed" as const,
    }];
  });
}

export function repositoryEcosystemProviderAttempt(
  workspaceRoot: string,
): DevelopmentEnvironmentProviderAttempt {
  const providers = detectRepositoryEcosystemProviders(workspaceRoot);
  return {
    provider: "repository-ecosystem",
    stage: "discovery",
    outcome: providers.length > 0 ? "available" : "not-applicable",
    summary: providers.length > 0
      ? `Repository-native dependency authority detected: ${providers.map((provider) => provider.ecosystem).join(", ")}.`
      : "No repository-native dependency manifests were detected for this managed requirement.",
    candidates: providers.map((provider) => ({
      packageName: provider.ecosystem,
      packageId: provider.restoreCommand.join(" "),
      source: provider.evidencePath,
      publisher: provider.requiredSystemTool,
    })),
  };
}

function findEvidencePath(workspaceRoot: string, pattern: string): string | null {
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1);
    return findFirstFileWithSuffix(workspaceRoot, suffix);
  }
  const absolutePath = path.join(workspaceRoot, pattern);
  return fs.existsSync(absolutePath) ? pattern : null;
}

function findFirstFileWithSuffix(workspaceRoot: string, suffix: string): string | null {
  const entries = safeReadDirectory(workspaceRoot);
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(suffix)) {
      return entry.name;
    }
  }
  return null;
}

function mavenExecutable(workspaceRoot: string): string {
  if (fs.existsSync(path.join(workspaceRoot, "mvnw.cmd"))) {
    return "mvnw.cmd";
  }
  if (fs.existsSync(path.join(workspaceRoot, "mvnw"))) {
    return "mvnw";
  }
  return "mvn";
}

function gradleExecutable(workspaceRoot: string): string {
  if (fs.existsSync(path.join(workspaceRoot, "gradlew.bat"))) {
    return "gradlew.bat";
  }
  if (fs.existsSync(path.join(workspaceRoot, "gradlew"))) {
    return "gradlew";
  }
  return "gradle";
}

function safeReadDirectory(workspaceRoot: string): fs.Dirent[] {
  try {
    return fs.readdirSync(workspaceRoot, { withFileTypes: true });
  } catch {
    return [];
  }
}
