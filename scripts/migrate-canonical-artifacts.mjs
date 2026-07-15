#!/usr/bin/env node
import path from "node:path";
import process from "node:process";

import {
  applyMigrationPlan,
  buildMigrationPlan,
  inventoryMigration,
  verifyMigratedRepository,
} from "./migration/wc09/migrate-artifacts.mjs";

const mode = readArgument("--mode") ?? "inventory";
const root = path.resolve(readArgument("--root") ?? ".");
const idempotence = process.argv.includes("--idempotence");

try {
  let result;
  switch (mode) {
    case "inventory":
      result = await inventoryMigration(root);
      break;
    case "dry-run": {
      const plan = await buildMigrationPlan(root);
      result = { mode, ...plan.inventory, ...plan.summary };
      break;
    }
    case "apply": {
      const plan = await buildMigrationPlan(root);
      result = { mode, ...(await applyMigrationPlan(plan)) };
      break;
    }
    case "verify":
      result = {
        mode,
        ...(await verifyMigratedRepository(root, { idempotence })),
      };
      break;
    default:
      throw new Error(
        "--mode must be inventory, dry-run, apply, or verify.",
      );
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.ok === false) process.exitCode = 1;
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}

function readArgument(name) {
  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1];
  return process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
}
