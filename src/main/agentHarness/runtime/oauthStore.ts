import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface OAuthClientRecord {
  client_id: string;
  redirect_uris: string[];
  client_name?: string;
  client_uri?: string;
  grant_types: string[];
  response_types: string[];
  scope: string;
  created_at: string;
}

export interface OAuthTokenRecord {
  access_token_hash: string;
  refresh_token_hash: string;
  client_id: string;
  scope: string;
  expires_at: string;
  refresh_expires_at: string;
  revoked?: boolean;
}

interface OAuthStore {
  clients: OAuthClientRecord[];
  codes: Array<{
    code_hash: string;
    client_id: string;
    redirect_uri: string;
    scope: string;
    code_challenge: string;
    code_challenge_method: "S256";
    expires_at: string;
    used: boolean;
  }>;
  tokens: OAuthTokenRecord[];
}

export interface OAuthStoreDiagnostics {
  clientCount: number;
  filesReadClientCount: number;
  filesWriteClientCount: number;
  activeTokenCount: number;
  activeFilesReadAuthorizationCount: number;
  activeFilesWriteAuthorizationCount: number;
}

export interface LegacyOAuthClientImportResult {
  importedCount: number;
  alreadyPresentCount: number;
  totalAcceptedCount: number;
  registeredClientCount: number;
}

export const OAUTH_SCOPES = ["files.read", "files.write"] as const;
type OAuthScope = (typeof OAUTH_SCOPES)[number];

const DCR_GRANT_TYPES = ["authorization_code", "refresh_token"] as const;
const DCR_RESPONSE_TYPES = ["code"] as const;
const MAX_CLIENT_METADATA_STRING_LENGTH = 200;
const MAX_CLIENT_URI_LENGTH = 2048;
const MAX_REDIRECT_URI_LENGTH = 2048;
const AUTHORIZATION_CODE_SECONDS = 600;
const ACCESS_TOKEN_SECONDS = 3600;
const REFRESH_TOKEN_SECONDS = 30 * 24 * 60 * 60;
const PKCE_S256_CHALLENGE_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/u;

function storePath(userDataRoot: string): string {
  return path.join(userDataRoot, "agent-harness", "oauth", "oauth-store.local.json");
}

function readStore(userDataRoot: string): OAuthStore {
  const target = storePath(userDataRoot);
  if (!fs.existsSync(target)) {
    return { clients: [], codes: [], tokens: [] };
  }
  const parsed = JSON.parse(fs.readFileSync(target, "utf8")) as Partial<OAuthStore>;
  return {
    clients: Array.isArray(parsed.clients) ? parsed.clients : [],
    codes: Array.isArray(parsed.codes) ? parsed.codes : [],
    tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [],
  };
}

function writeStore(userDataRoot: string, store: OAuthStore): void {
  const target = storePath(userDataRoot);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function token(): string {
  return randomBytes(32).toString("base64url");
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function registerOAuthClient(userDataRoot: string, input: Record<string, unknown>): OAuthClientRecord {
  const store = readStore(userDataRoot);
  const payload = input as Record<string, unknown>;
  const redirectUris = assertRedirectUriArray(payload.redirect_uris);
  const tokenEndpointAuthMethod = typeof payload.token_endpoint_auth_method === "string" ? payload.token_endpoint_auth_method : "none";
  if (tokenEndpointAuthMethod !== "none") {
    throw new Error("token_endpoint_auth_method must be none for public PKCE clients.");
  }
  const grantTypes = Array.isArray(payload.grant_types)
    ? assertSupportedStringArray(payload.grant_types, "grant_types", DCR_GRANT_TYPES, "authorization_code")
    : [...DCR_GRANT_TYPES];
  const responseTypes = Array.isArray(payload.response_types)
    ? assertSupportedStringArray(payload.response_types, "response_types", DCR_RESPONSE_TYPES, "code")
    : [...DCR_RESPONSE_TYPES];
  const client: OAuthClientRecord = {
    client_id: `ccai_${token().slice(0, 20)}`,
    redirect_uris: redirectUris,
    client_name: optionalClientMetadataString(payload.client_name, "client_name"),
    client_uri: optionalClientUri(payload.client_uri),
    grant_types: grantTypes,
    response_types: responseTypes,
    scope: assertSupportedScope(typeof payload.scope === "string" ? payload.scope : "files.read"),
    created_at: new Date().toISOString(),
  };
  writeStore(userDataRoot, { ...store, clients: [...store.clients, client] });
  return client;
}

export function importLegacyOAuthClientRegistry(
  userDataRoot: string,
  source: unknown,
): LegacyOAuthClientImportResult {
  const legacyClients = parseLegacyClientRegistry(source);
  const incoming = legacyClients.map(normalizeLegacyOAuthClient);
  assertUniqueClientIds(incoming);

  const store = readStore(userDataRoot);
  const merged = [...store.clients];
  let importedCount = 0;
  let alreadyPresentCount = 0;

  for (const client of incoming) {
    const existing = merged.find((entry) => entry.client_id === client.client_id);
    if (!existing) {
      merged.push(client);
      importedCount += 1;
      continue;
    }
    if (!clientRecordsEquivalent(existing, client)) {
      throw new Error(`OAuth client ${client.client_id} already exists with different registration metadata.`);
    }
    alreadyPresentCount += 1;
  }

  if (importedCount > 0) {
    writeStore(userDataRoot, { ...store, clients: merged });
  }

  return {
    importedCount,
    alreadyPresentCount,
    totalAcceptedCount: incoming.length,
    registeredClientCount: merged.length,
  };
}

export function validateOAuthAuthorizationRequest(userDataRoot: string, input: {
  client_id: string;
  redirect_uri: string;
  response_type?: string;
  scope?: string;
  code_challenge: string;
  code_challenge_method?: string;
}): { ok: true; client: OAuthClientRecord; scope: string } | { ok: false; error: "invalid_request" | "invalid_scope"; description: string } {
  const store = readStore(userDataRoot);
  const client = store.clients.find((entry) => entry.client_id === input.client_id);
  if (!client) {
    return { ok: false, error: "invalid_request", description: "Invalid client_id." };
  }
  if (!input.redirect_uri || !client.redirect_uris.includes(input.redirect_uri)) {
    return { ok: false, error: "invalid_request", description: "Invalid redirect_uri." };
  }
  if (input.response_type !== "code") {
    return { ok: false, error: "invalid_request", description: "Only response_type=code is supported." };
  }
  if (
    !input.code_challenge ||
    input.code_challenge_method !== "S256" ||
    !PKCE_S256_CHALLENGE_PATTERN.test(input.code_challenge)
  ) {
    return { ok: false, error: "invalid_request", description: "PKCE S256 code_challenge is required." };
  }
  let requestedScope: string;
  try {
    requestedScope = assertSupportedScope(input.scope ?? client.scope);
  } catch (error) {
    return {
      ok: false,
      error: "invalid_scope",
      description: error instanceof Error ? error.message : "Requested scope contains an unsupported value.",
    };
  }
  return { ok: true, client, scope: requestedScope };
}

export function issueAuthorizationCode(userDataRoot: string, input: {
  client_id: string;
  redirect_uri: string;
  scope: string;
  code_challenge: string;
}): string {
  const store = readStore(userDataRoot);
  const code = token();
  writeStore(userDataRoot, {
    ...store,
    codes: [
      ...store.codes,
      {
        code_hash: hash(code),
        client_id: input.client_id,
        redirect_uri: input.redirect_uri,
        scope: normalizeScope(input.scope),
        code_challenge: input.code_challenge,
        code_challenge_method: "S256",
        expires_at: new Date(Date.now() + AUTHORIZATION_CODE_SECONDS * 1000).toISOString(),
        used: false,
      },
    ],
  });
  return code;
}

export function exchangeAuthorizationCode(userDataRoot: string, input: {
  code: string;
  client_id: string;
  redirect_uri: string;
  code_verifier: string;
}): { access_token: string; refresh_token: string; token_type: "Bearer"; expires_in: number; scope: string } | null {
  const store = readStore(userDataRoot);
  const codeHash = hash(input.code);
  const code = store.codes.find((entry) => entry.code_hash === codeHash && entry.client_id === input.client_id && entry.redirect_uri === input.redirect_uri);
  const client = store.clients.find((entry) => entry.client_id === input.client_id);
  if (
    !code ||
    code.used ||
    !client ||
    !client.redirect_uris.includes(input.redirect_uri) ||
    Date.parse(code.expires_at) <= Date.now() ||
    code.code_challenge_method !== "S256" ||
    pkceChallenge(input.code_verifier) !== code.code_challenge
  ) {
    return null;
  }
  const issued = issueTokens(code.client_id, code.scope);
  writeStore(userDataRoot, {
    ...store,
    codes: store.codes.filter((entry) => entry !== code),
    tokens: [...store.tokens, issued.record],
  });
  return issued.publicToken;
}

export function refreshOAuthAccessToken(userDataRoot: string, input: { refresh_token: string; client_id: string }): {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
} | null {
  const store = readStore(userDataRoot);
  const refreshHash = hash(input.refresh_token);
  const existing = store.tokens.find((entry) => entry.refresh_token_hash === refreshHash && entry.client_id === input.client_id);
  const client = store.clients.find((entry) => entry.client_id === input.client_id);
  if (!existing || existing.revoked || !client || !timestampIsFuture(existing.refresh_expires_at)) {
    return null;
  }
  const issued = issueTokens(existing.client_id, existing.scope);
  writeStore(userDataRoot, {
    ...store,
    tokens: [...store.tokens.filter((entry) => entry !== existing), issued.record],
  });
  return issued.publicToken;
}

export function validateAccessToken(userDataRoot: string, accessToken: string): { clientId: string; scope: string } | null {
  const store = readStore(userDataRoot);
  const tokenRecord = store.tokens.find((entry) => entry.access_token_hash === hash(accessToken));
  const client = tokenRecord ? store.clients.find((entry) => entry.client_id === tokenRecord.client_id) : undefined;
  if (!tokenRecord || tokenRecord.revoked || !client || Date.parse(tokenRecord.expires_at) <= Date.now()) {
    return null;
  }
  return { clientId: tokenRecord.client_id, scope: tokenRecord.scope };
}

export function readOAuthStoreDiagnostics(userDataRoot: string): OAuthStoreDiagnostics {
  const store = readStore(userDataRoot);
  const now = Date.now();
  const activeTokens = store.tokens.filter((entry) => !entry.revoked && Date.parse(entry.expires_at) > now);
  return {
    clientCount: store.clients.length,
    filesReadClientCount: store.clients.filter((entry) => scopeIncludes(entry.scope, "files.read")).length,
    filesWriteClientCount: store.clients.filter((entry) => scopeIncludes(entry.scope, "files.write")).length,
    activeTokenCount: activeTokens.length,
    activeFilesReadAuthorizationCount: activeTokens.filter((entry) => scopeIncludes(entry.scope, "files.read")).length,
    activeFilesWriteAuthorizationCount: activeTokens.filter((entry) => scopeIncludes(entry.scope, "files.write")).length,
  };
}

export function normalizeScope(scope: string): string {
  const scopes = new Set(scope.split(/\s+/).filter((entry): entry is OAuthScope => OAUTH_SCOPES.includes(entry as OAuthScope)));
  if (scopes.size === 0) {
    scopes.add("files.read");
  }
  return [...scopes].join(" ");
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

function issueTokens(clientId: string, scope: string): {
  publicToken: { access_token: string; refresh_token: string; token_type: "Bearer"; expires_in: number; scope: string };
  record: OAuthTokenRecord;
} {
  const accessToken = token();
  const refreshToken = token();
  return {
    publicToken: {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_SECONDS,
      scope,
    },
    record: {
      access_token_hash: hash(accessToken),
      refresh_token_hash: hash(refreshToken),
      client_id: clientId,
      scope,
      expires_at: new Date(Date.now() + ACCESS_TOKEN_SECONDS * 1000).toISOString(),
      refresh_expires_at: new Date(Date.now() + REFRESH_TOKEN_SECONDS * 1000).toISOString(),
      revoked: false,
    },
  };
}

function scopeIncludes(scope: string, expected: "files.read" | "files.write"): boolean {
  return normalizeScope(scope).split(/\s+/).includes(expected);
}

function timestampIsFuture(value: unknown): boolean {
  return typeof value === "string" && Date.parse(value) > Date.now();
}

function parseLegacyClientRegistry(source: unknown): unknown[] {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("Legacy OAuth client registry must be an object with a clients array.");
  }
  const clients = (source as { clients?: unknown }).clients;
  if (!Array.isArray(clients)) {
    throw new Error("Legacy OAuth client registry must contain a clients array.");
  }
  return clients;
}

function normalizeLegacyOAuthClient(value: unknown): OAuthClientRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Legacy OAuth client record must be an object.");
  }
  const payload = value as Record<string, unknown>;
  const clientId = requiredClientId(payload.client_id);
  return {
    client_id: clientId,
    redirect_uris: assertRedirectUriArray(payload.redirect_uris),
    client_name: optionalClientMetadataString(payload.client_name, "client_name"),
    client_uri: optionalClientUri(payload.client_uri),
    grant_types: Array.isArray(payload.grant_types)
      ? assertSupportedStringArray(payload.grant_types, "grant_types", DCR_GRANT_TYPES, "authorization_code")
      : [...DCR_GRANT_TYPES],
    response_types: Array.isArray(payload.response_types)
      ? assertSupportedStringArray(payload.response_types, "response_types", DCR_RESPONSE_TYPES, "code")
      : [...DCR_RESPONSE_TYPES],
    scope: assertSupportedScope(payload.scope),
    created_at: requiredIsoTimestamp(payload.created_at, "created_at"),
  };
}

function assertUniqueClientIds(clients: OAuthClientRecord[]): void {
  const seen = new Set<string>();
  for (const client of clients) {
    if (seen.has(client.client_id)) {
      throw new Error(`Legacy OAuth client registry contains duplicate client_id ${client.client_id}.`);
    }
    seen.add(client.client_id);
  }
}

function clientRecordsEquivalent(left: OAuthClientRecord, right: OAuthClientRecord): boolean {
  return JSON.stringify(canonicalClientRecord(left)) === JSON.stringify(canonicalClientRecord(right));
}

function canonicalClientRecord(client: OAuthClientRecord): OAuthClientRecord {
  return {
    client_id: client.client_id,
    redirect_uris: [...client.redirect_uris],
    client_name: client.client_name,
    client_uri: client.client_uri,
    grant_types: [...client.grant_types],
    response_types: [...client.response_types],
    scope: client.scope,
    created_at: client.created_at,
  };
}

function requiredClientId(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("client_id must be a string.");
  }
  const clientId = value.trim();
  if (!clientId || clientId !== value || /\s/.test(clientId)) {
    throw new Error("client_id must be a non-empty string without surrounding or embedded whitespace.");
  }
  return clientId;
}

function requiredIsoTimestamp(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be a valid timestamp.`);
  }
  return value;
}

function assertSupportedScope(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("scope must be a string.");
  }
  const entries = value.split(/\s+/).filter(Boolean);
  if (entries.length === 0) {
    throw new Error("scope must include at least one supported OAuth scope.");
  }
  const unsupported = entries.filter((entry) => !OAUTH_SCOPES.includes(entry as OAuthScope));
  if (unsupported.length > 0) {
    throw new Error(`scope contains unsupported value "${unsupported[0]}".`);
  }
  return normalizeScope(value);
}

function assertStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== "string" || entry.trim() === "")) {
    throw new Error(`${label} must be a non-empty array of strings.`);
  }
  return value.map((entry) => entry.trim());
}

function assertSupportedStringArray<T extends string>(
  value: unknown,
  label: string,
  supportedValues: readonly T[],
  requiredValue: T,
): T[] {
  const entries = assertStringArray(value, label);
  const unsupported = entries.filter((entry) => !supportedValues.includes(entry as T));
  if (unsupported.length > 0) {
    throw new Error(`${label} contains unsupported value "${unsupported[0]}".`);
  }
  if (!entries.includes(requiredValue)) {
    throw new Error(`${label} must include ${requiredValue}.`);
  }
  return [...new Set(entries)] as T[];
}

function assertRedirectUriArray(value: unknown): string[] {
  const entries = assertStringArray(value, "redirect_uris");
  return [...new Set(entries.map((entry) => assertOAuthUrl(entry, "redirect_uri", MAX_REDIRECT_URI_LENGTH)))];
}

function assertOAuthUrl(value: string, label: string, maxLength: number): string {
  if (value.length > maxLength) {
    throw new Error(`${label} is too long.`);
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute http or https URL.`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${label} must not include credentials.`);
  }
  if (parsed.hash) {
    throw new Error(`${label} must not include a fragment.`);
  }
  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "https:" && !(protocol === "http:" && isLocalOAuthHostname(parsed.hostname))) {
    throw new Error(`${label} must use https, except localhost http URLs for local testing.`);
  }
  return parsed.toString();
}

function isLocalOAuthHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1" || normalized === "[::1]";
}

function optionalClientMetadataString(value: unknown, label: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string.`);
  }
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  if (normalized.length > MAX_CLIENT_METADATA_STRING_LENGTH) {
    throw new Error(`${label} is too long.`);
  }
  if (/[\r\n]/.test(normalized)) {
    throw new Error(`${label} must be a single line.`);
  }
  return normalized;
}

function optionalClientUri(value: unknown): string | undefined {
  const normalized = optionalClientMetadataString(value, "client_uri");
  return normalized ? assertOAuthUrl(normalized, "client_uri", MAX_CLIENT_URI_LENGTH) : undefined;
}
