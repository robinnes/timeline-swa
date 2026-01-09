/**
 * Auth0 Management API helper for Azure Static Web Apps API (Azure Functions).
 *
 * Requires these environment variables (set in SWA Application settings):
 *  - AUTH0_DOMAIN                 e.g. dev-xxxx.us.auth0.com
 *  - AUTH0_MGMT_CLIENT_ID
 *  - AUTH0_MGMT_CLIENT_SECRET
 *  - AUTH0_MGMT_AUDIENCE          e.g. https://dev-xxxx.us.auth0.com/api/v2/
 *
 * Minimum scopes required on the M2M app:
 *  - read:users (for GET /api/v2/users/{id})
 */

const DEFAULT_TOKEN_SKEW_SECONDS = 60; // refresh 60s early

let cachedToken = null; // { accessToken, expiresAtEpochSec }
const usernameCache = new Map(); // userId -> { username, expiresAtMs }

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function getConfig() {
  return {
    domain: requireEnv('AUTH0_DOMAIN'),
    clientId: requireEnv('AUTH0_MGMT_CLIENT_ID'),
    clientSecret: requireEnv('AUTH0_MGMT_CLIENT_SECRET'),
    audience: requireEnv('AUTH0_MGMT_AUDIENCE')
  };
}

async function getManagementToken() {
  const nowSec = Math.floor(Date.now() / 1000);

  if (cachedToken && cachedToken.expiresAtEpochSec - DEFAULT_TOKEN_SKEW_SECONDS > nowSec) {
    return cachedToken.accessToken;
  }

  const { domain, clientId, clientSecret, audience } = getConfig();

  const tokenUrl = `https://${domain}/oauth/token`;

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience
    })
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Auth0 token request failed (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  const accessToken = data.access_token;
  const expiresIn = Number(data.expires_in || 0);

  if (!accessToken || !expiresIn) {
    throw new Error('Auth0 token response missing access_token or expires_in');
  }

  cachedToken = {
    accessToken,
    expiresAtEpochSec: nowSec + expiresIn
  };

  return accessToken;
}

/**
 * Fetches Auth0 user profile by Auth0 user_id (e.g. "auth0|6944...")
 * Per Auth0 docs, user_id must be URL-encoded in the path.
 */
async function getUserById(auth0UserId) {
  if (!auth0UserId) throw new Error('auth0UserId is required');

  const { domain } = getConfig();
  const token = await getManagementToken();

  const url = `https://${domain}/api/v2/users/${encodeURIComponent(auth0UserId)}`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: { authorization: `Bearer ${token}` }
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Auth0 get user failed (${resp.status}): ${text}`);
  }

  return resp.json();
}

/**
 * Returns the Auth0 "username" field for a given Auth0 user_id, or null if absent.
 * Uses a small in-memory cache (per-function-instance).
 */
async function getUsername(auth0UserId, { cacheMs = 10 * 60 * 1000 } = {}) {
  if (!auth0UserId) throw new Error('auth0UserId is required');

  const cached = usernameCache.get(auth0UserId);
  if (cached && cached.expiresAtMs > Date.now()) return cached.username;

  const profile = await getUserById(auth0UserId);
  const username = profile?.username || null;

  usernameCache.set(auth0UserId, {
    username,
    expiresAtMs: Date.now() + cacheMs
  });

  return username;
}

/**
 * Converts a username into a safe blob path segment.
 * You can tighten this if you want stricter public folder naming rules.
 */
function sanitizeUsernameForPath(username) {
  return String(username || '')
    .trim()
    .toLowerCase()
    // Allow a-z 0-9 _ -
    .replace(/[^a-z0-9_-]/g, '_')
    // avoid empty
    .replace(/^_+|_+$/g, '');
}

/**
 * Convenience: given an Auth0 user_id, return a safe folder key based on username.
 * Falls back to null if username isn't present.
 */
async function getUsernameKey(auth0UserId) {
  const username = await getUsername(auth0UserId);
  if (!username) return null;
  const key = sanitizeUsernameForPath(username);
  return key || null;
}

module.exports = {
  getManagementToken,
  getUserById,
  getUsername,
  sanitizeUsernameForPath,
  getUsernameKey
};
