const { BlobServiceClient } = require("@azure/storage-blob");

const AUTHORIZATION_CONTAINER = "configuration";
const AUTHORIZATION_BLOB = "authorization.json";
const CACHE_DURATION_MS = 60_000;

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);

const authorizationBlobClient = blobServiceClient
  .getContainerClient(AUTHORIZATION_CONTAINER)
  .getBlobClient(AUTHORIZATION_BLOB);

let cachedAuthorization = null;
let cacheExpiresAt = 0;

function getClientPrincipal(req) {
  const encoded = req.headers["x-ms-client-principal"];
  if (!encoded) return null;

  try {
    return JSON.parse(
      Buffer.from(encoded, "base64").toString("utf8")
    );
  } catch {
    return null;
  }
}

async function loadAuthorization() {
  const now = Date.now();

  if (cachedAuthorization && now < cacheExpiresAt) {
    return cachedAuthorization;
  }

  const response = await authorizationBlobClient.download();
  const text = await streamToString(response.readableStreamBody);

  cachedAuthorization = JSON.parse(text);
  cacheExpiresAt = now + CACHE_DURATION_MS;

  return cachedAuthorization;
}

async function getUserRoles(req) {
  const principal = getClientPrincipal(req);
  if (!principal?.userId) return [];

  const authorization = await loadAuthorization();

  return authorization.users?.[principal.userId]?.roles ?? [];
}

async function hasRole(req, requiredRole) {
  const roles = await getUserRoles(req);

  if (roles.includes("admin")) return true;

  return roles.includes(requiredRole);
}

async function canPublish(req) {
  return hasRole(req, "pro");
}

async function canUseThumbnails(req) {
  return hasRole(req, "pro");
}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    stream.on("data", chunk => chunks.push(Buffer.from(chunk)));
    stream.on("end", () =>
      resolve(Buffer.concat(chunks).toString("utf8"))
    );
    stream.on("error", reject);
  });
}

module.exports = {
  getClientPrincipal,
  getUserRoles,
  hasRole,
  canPublish,
  canUseThumbnails
};