const { BlobServiceClient } = require("@azure/storage-blob");
const { getClientPrincipal } = require("./utils");

const AUTHORIZATION_BLOB = "configuration/authorization.json";
const CACHE_DURATION_MS = 60_000;

let cachedAuthorization = null;
let cacheExpiresAt = 0;

function getAuthorizationBlobClient() {
  const connectionString = process.env.TIMELINE_STORAGE_CONN;
  const containerName = process.env.TIMELINE_STORAGE_CONTAINER;

  if (!connectionString) {
    throw new Error("TIMELINE_STORAGE_CONN is not configured.");
  }

  if (!containerName) {
    throw new Error("TIMELINE_STORAGE_CONTAINER is not configured.");
  }

  return BlobServiceClient
    .fromConnectionString(connectionString)
    .getContainerClient(containerName)
    .getBlobClient(AUTHORIZATION_BLOB);
}

async function loadAuthorization() {
  const now = Date.now();

  if (cachedAuthorization && now < cacheExpiresAt) {
    return cachedAuthorization;
  }

  const response = await getAuthorizationBlobClient().download();
  const text = await streamToString(response.readableStreamBody);
  const authorization = JSON.parse(text);

  cachedAuthorization = authorization;
  cacheExpiresAt = now + CACHE_DURATION_MS;

  return authorization;
}

async function getUserRoles(request) {
  const principal = getClientPrincipal(request);
  if (!principal?.userId) return [];

  const authorization = await loadAuthorization();

  return authorization.users?.[principal.userId]?.roles ?? [];
}

async function hasRole(request, requiredRole) {
  const roles = await getUserRoles(request);

  return roles.includes("admin") ||
         roles.includes(requiredRole);
}

async function canPublish(request) {
  return hasRole(request, "pro");
}

async function canUseThumbnails(request) {
  return hasRole(request, "pro");
}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    stream.on("data", chunk => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
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