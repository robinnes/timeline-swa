/*
module.exports = {
    extractConnectionStringParts: function(connectionString) {
        const parts = connectionString.split(';');
        let protocol, endpointSuffix, accountName, accountKey;

        for (const part of parts) {
            const [key, value] = part.split('=', 2);
            if (!key) continue;
            if (key === 'AccountName') accountName = value;
            if (key === 'AccountKey') accountKey = value;
            if (key === 'DefaultEndpointsProtocol') protocol = value;
            if (key === 'EndpointSuffix') endpointSuffix = value;
        }

        // Build URL after we've parsed all parts so accountName is available
        let url;
        if (protocol && accountName && endpointSuffix) {
            url = `${protocol}://${accountName}.blob.${endpointSuffix}`;
        } else if (protocol && accountName) {
            url = `${protocol}://${accountName}.blob.core.windows.net`;
        }

        return { accountName, accountKey, url };
    }
};
*/

/**
 * Shared utilities for Azure Static Web Apps (SWA) authenticated functions.
 *
 * Intended use:
 * - Decode SWA client principal (x-ms-client-principal)
 * - Derive per-user virtual folder prefix: private/<sanitizedUserId>/
 * - Validate filenames to prevent path traversal
 * - Parse storage connection string parts
 * - Provide small response helpers
 */

const { getUsernameKey } = require('./auth0Mgmt');
//const CONTAINER_NAME = "timelines";  doesn't work for some reason

/* --------------------------------- Responses --------------------------------- */

function json(status, obj) {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  };
}

function badRequest(message, extra = {}) {
  return json(400, { error: message, ...extra });
}

function unauthorized(message = 'Not authenticated') {
  return json(401, { error: message });
}

function serverError(message = 'Server error', err) {
  return json(500, { error: message, detail: err?.message || String(err || '') });
}

/* --------------------------- SWA Principal / User ---------------------------- */

/**
 * Azure Static Web Apps injects x-ms-client-principal on authenticated API requests.
 * The header value is Base64-encoded JSON.
 *
 * Returns parsed principal object or null if missing/invalid.
 */
function getClientPrincipal(request) {
  // Fetch API style headers (used by @azure/functions v4)
  const header =
    request?.headers?.get?.('x-ms-client-principal') ||
    request?.headers?.get?.('X-MS-CLIENT-PRINCIPAL');

  if (!header) return null;

  try {
    const jsonStr = Buffer.from(header, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Returns the raw userId from the SWA principal (e.g. "auth0|abc123"),
 * or null if not authenticated.
 */
function getRawUserId(request) {
  const principal = getClientPrincipal(request);
  return principal?.userId || null;
}

/**
 * Converts a string to a safe blob path segment:
 * keep [A-Za-z0-9_-], replace everything else with "_".
 *
 * Example: "auth0|6944c..." => "auth0_6944c..."
 */
function sanitizeForPathSegment(value) {
  return String(value || '').replace(/[^A-Za-z0-9_-]/g, '_');
}

/**
 * Require an authenticated user and return the sanitized user key.
 * Throws an Error if userId is missing.
 */
function requireUserKey(request) {
  const raw = getRawUserId(request);
  if (!raw) {
    throw new Error('Not authenticated (missing client principal userId)');
  }
  return sanitizeForPathSegment(raw);
}

/**
 * Return the per-user private prefix inside the timelines container:
 * "private/<userKey>/"
 */
function privatePrefixForUserKey(userKey) {
  return `private/${userKey}/`;
}

/**
 * Convenience: derive "private/<sanitizedUserId>/" directly from request.
 */
function requirePrivatePrefix(request) {
  const userKey = requireUserKey(request);
  return privatePrefixForUserKey(userKey);
}

/* ---------------------------- Filename / Path Safety -------------------------- */

/**
 * Restrict filename to a single segment (no slashes/backslashes) to prevent escaping
 * out of "private/<userKey>/".
 *
 * Examples allowed: "career.json", "my timeline.json"
 * Examples rejected: "../x.json", "a/b.json", "a\\b.json"
 */
function isSafeFilename(name, { maxLen = 200 } = {}) {
  const s = String(name || '');
  if (!s) return false;
  if (s.length > maxLen) return false;
  if (s.includes('/') || s.includes('\\')) return false;
  if (s.includes('..')) return false;
  // Optional tightening:
  // if (s.startsWith('.')) return false; // disallow dotfiles
  return true;
}

/**
 * Ensure filename is safe; throws Error if not.
 */
function requireSafeFilename(name) {
  if (!isSafeFilename(name)) {
    throw new Error('Invalid filename (must be a single file name, no slashes or "..")');
  }
  return String(name);
}

/* ------------------------ Storage connection string parsing -------------------- */

/**
 * Parse an Azure Storage connection string into:
 * - url  (e.g. https://<acct>.blob.core.windows.net)
 * - accountName
 * - accountKey (Buffer)
 *
 * (Same logic as your existing per-function utils.js; moved here for reuse.)
 */
function extractConnectionStringParts(connectionString) {
  const parts = String(connectionString || '').split(';');

  const keyValuePairs = {};
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value) keyValuePairs[key] = value;
  }

  const url = `https://${keyValuePairs.AccountName}.blob.core.windows.net`;
  const accountKey = Buffer.from(keyValuePairs.AccountKey || '', 'base64');
  const accountName = keyValuePairs.AccountName;

  return { url, accountName, accountKey };
}


/* ------------------------ UserName -------------------- */

/**
 * Require an authenticated user and return a username-based folder key.
 * Throws if unauthenticated or username unavailable.
 */
async function requireUsernameFolderKey(request) {
  const auth0UserId = getRawUserId(request);
  if (!auth0UserId) {
    throw new Error('Not authenticated');
  }

  const usernameKey = await getUsernameKey(auth0UserId);
  if (!usernameKey) {
    throw new Error('Username not available for this user');
  }

  return usernameKey;
}

/**
 * private/<username>/
 */
function privatePrefixForUsername(usernameKey) {
  return `private/${usernameKey}/`;
}

/**
 * public/<username>/
 */
function publicPrefixForUsername(usernameKey) {
  return `public/${usernameKey}/`;
}



/* --------------------------------- Exports ---------------------------------- */

module.exports = {
  // responses
  json,
  badRequest,
  unauthorized,
  serverError,

  // principal / user
  getClientPrincipal,
  getRawUserId,
  sanitizeForPathSegment,
  requireUserKey,
  privatePrefixForUserKey,
  requirePrivatePrefix,

  // filename safety
  isSafeFilename,
  requireSafeFilename,

  // storage parsing
  extractConnectionStringParts,

  // username
  requireUsernameFolderKey,
  privatePrefixForUsername,
  publicPrefixForUsername
};
