const { app } = require('@azure/functions');

const {
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters
} = require('@azure/storage-blob');

const {
  json,
  badRequest,
  unauthorized,
  serverError,
  //requireUserKey,
  requireUsernameFolderKey,
  //privatePrefixForUserKey,
  //privatePrefixForUsername,
  requireSafeFilename,
  extractConnectionStringParts
} = require('../utils');

app.http('getBlobSas', {
  methods: ['GET'], 
  authLevel: 'anonymous', // SWA enforces auth via staticwebapp.config.json routes :contentReference[oaicite:2]{index=2}
  handler: async (request, context) => {
    try {
      const conn = process.env.TIMELINE_STORAGE_CONN;
      const containerName = 'timelines';
      const {scope, name, mode} = await getParams(request);
      if (!name) return badRequest('Missing filename. Provide ?scope=<public|private>&name=<filename>&mode=<read|write>.');

      // Prevent path traversal / escaping out of private/<userKey>/
      let filename;
      try {
        filename = requireSafeFilename(name);
      } catch (e) {
        return badRequest(e.message);
      }

      let blobName;
      if (scope === "public" && mode === "read") {
        // No need to apply user-level security; restricted to 'public' folder, and virtual folder name is supplied
        blobName = `${scope}/${filename}`;

      } else {
        // acquire user name - get user ID from SWA and use that to get username from the identity provider
        let usernameKey;
        try {
          // Authenticated identity from SWA -> userKey derived from principal.userId (Auth0: "auth0|...") :contentReference[oaicite:3]{index=3}
          usernameKey = await requireUsernameFolderKey(request);
        } catch (e) {
          return unauthorized(e.message);
        }
        blobName = `${scope}/${usernameKey}/${filename}`;
      }

      const payload = generateBlobSas(conn, containerName, blobName, mode || 'write');

      return json(200, payload);
    } catch (err) {
      context.log.error('Error generating user-scoped blob SAS', err);
      return serverError('Failed to generate SAS token', err);
    }
  }
});

/**
 * GET /api/getBlobSas?scope=<public|private>&name=<filename>&mode=<read|write>
 */
async function getParams(request) {
  const url = new URL(request.url);

  const scopeFromQuery = url.searchParams.get('scope');
  const nameFromQuery = url.searchParams.get('name'); // || url.searchParams.get('file');
  const modeFromQuery = url.searchParams.get('mode');

  if (nameFromQuery) {
    return {scope:scopeFromQuery, name:nameFromQuery, mode:modeFromQuery};
  }
}

function generateBlobSas(connectionString, containerName, blobName, mode) {
  const { accountName, accountKey, url } = extractConnectionStringParts(connectionString);

  if (!accountName || !accountKey || !url) {
    throw new Error('Invalid storage connection string (missing accountName/accountKey/url)');
  }

  // Your existing parser returns accountKey as a base64 string. Convert to bytes for the credential.
  // (If your shared extractConnectionStringParts returns a Buffer instead, remove the Buffer.from() call.)
  const sharedKeyCredential = new StorageSharedKeyCredential(
    accountName,
    Buffer.from(accountKey, 'base64')
  );

  const expiresOn = new Date();
  expiresOn.setMinutes(expiresOn.getMinutes() + 30);

  const permissions = getBlobPermissions(mode);

  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions,
      expiresOn
    },
    sharedKeyCredential
  ).toString();

  const blobUrl = `${url}/${containerName}/${blobName}`;

  return {
    // convenient full URL
    sasUrl: `${blobUrl}?${sas}`,

    // fields that can be handy for debugging / clients
    url,
    container: containerName,
    blobName,
    blobUrl,
    sasKey: sas,
    mode
  };
}

/**
 * Least-privilege mapping:
 * - read  => r
 * - write => r + c + w
 */
function getBlobPermissions(mode) {
  const m = String(mode || '').toLowerCase();
  if (m === 'read' || m === 'r') return BlobSASPermissions.parse('r');
  return BlobSASPermissions.parse('rcw');
}
