import { createHash } from "node:crypto";

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type Sha256Digest = `sha256:${string}`;

/**
 * Return whether a value can be represented without loss as strict JSON.
 *
 * Class instances, sparse arrays, non-finite numbers, symbol properties, and
 * cyclic structures are deliberately rejected. Artifact payloads should not
 * depend on JavaScript-only serialization behavior.
 */
export function isJsonValue(value: unknown): value is JsonValue {
  try {
    canonicalStringify(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Serialize strict JSON with recursively sorted object keys.
 *
 * The output is deterministic across Node processes and is therefore suitable
 * for hashing and equality checks. This intentionally rejects values that
 * normal JSON.stringify would silently omit or coerce.
 */
export function canonicalStringify(value: unknown): string {
  return serializeCanonicalJson(value, new Set<object>(), "$", true);
}

/** Canonical key ordering rendered with the migrated artifact's two-space JSON format. */
export function canonicalPrettyStringify(value: unknown): string {
  return JSON.stringify(JSON.parse(canonicalStringify(value)), null, 2);
}

export function sha256Utf8(value: string): Sha256Digest {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

export function sha256Canonical(value: unknown): Sha256Digest {
  return sha256Utf8(canonicalStringify(value));
}

function serializeCanonicalJson(
  value: unknown,
  ancestors: Set<object>,
  path: string,
  isRoot: boolean,
): string {
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw new TypeError(`Non-finite number at ${path} is not canonical JSON.`);
      }

      return Object.is(value, -0) ? "0" : JSON.stringify(value);
    case "undefined":
    case "function":
    case "symbol":
    case "bigint":
      throw new TypeError(
        `${isRoot ? "Root value" : `Value at ${path}`} is not canonical JSON.`,
      );
  }

  if (ancestors.has(value)) {
    throw new TypeError(`Cyclic value at ${path} is not canonical JSON.`);
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const serializedItems: string[] = [];

      for (let index = 0; index < value.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) {
          throw new TypeError(`Sparse array item at ${path}[${index}] is not canonical JSON.`);
        }

        serializedItems.push(
          serializeCanonicalJson(value[index], ancestors, `${path}[${index}]`, false),
        );
      }

      if (Object.keys(value).some((key) => !/^(0|[1-9]\d*)$/.test(key))) {
        throw new TypeError(`Array at ${path} has non-index properties.`);
      }

      rejectSymbolProperties(value, path);
      return `[${serializedItems.join(",")}]`;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`Non-plain object at ${path} is not canonical JSON.`);
    }

    rejectSymbolProperties(value, path);

    const serializedProperties = Object.keys(value)
      .sort(compareCanonicalKeys)
      .map((key) => {
        const propertyValue = (value as Record<string, unknown>)[key];
        return `${JSON.stringify(key)}:${serializeCanonicalJson(
          propertyValue,
          ancestors,
          `${path}.${key}`,
          false,
        )}`;
      });

    return `{${serializedProperties.join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

function rejectSymbolProperties(value: object, path: string): void {
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`Symbol properties at ${path} are not canonical JSON.`);
  }
}

function compareCanonicalKeys(left: string, right: string): number {
  return left.localeCompare(right);
}
