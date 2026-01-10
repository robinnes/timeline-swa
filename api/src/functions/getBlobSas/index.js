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
  privatePrefixForUsername,
  requireSafeFilename,
  extractConnectionStringParts
} = require('../utils');

app.http('getBlobSas', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous', // SWA enforces auth via staticwebapp.config.json routes :contentReference[oaicite:2]{index=2}
  handler: async (request, context) => {
    try {
      const conn = process.env.TIMELINE_STORAGE_CONN;
      const containerName = 'timelines';
      const {name, mode} = await getParams(request);
      const url = new URL(request.url);
      const public = url.searchParams.has('public');  // if the 'public' parameter is present then retrieve from the public folder
      
      if (!name) {
        return badRequest(
          'Missing filename. Provide ?name=<filename> or JSON body { "name": "file.json" }.'
        );
      }

      let blobName;
      if (public && mode === "read") {
        // No need to apply user-level security; restricted to 'public' folder
        blobName = `public/${name}`;

      } else {
        // Authenticated identity from SWA -> userKey derived from principal.userId (Auth0: "auth0|...") :contentReference[oaicite:3]{index=3}
        let usernameKey;
        try {
          usernameKey = await requireUsernameFolderKey(request);
        } catch (e) {
          return unauthorized(e.message);
        }

        // Prevent path traversal / escaping out of private/<userKey>/
        let filename;
        try {
          filename = requireSafeFilename(name);
        } catch (e) {
          return badRequest(e.message);
        }

        const prefix = privatePrefixForUsername(usernameKey);
        blobName = `${prefix}${filename}`;
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
 * GET /api/getBlobSas?name=<file.json>&mode=<read|write>
 * POST JSON: { "name": "file.json", "mode": "read" }
 */
async function getParams(request) {
  const url = new URL(request.url);

  const nameFromQuery = url.searchParams.get('name') || url.searchParams.get('file');
  const modeFromQuery = url.searchParams.get('mode');

  if (nameFromQuery) {
    return { name: nameFromQuery, mode: modeFromQuery };
  }

  if ((request.method || '').toUpperCase() === 'POST') {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const body = await request.json().catch(() => null);
      if (body && (body.name || body.file)) {
        return { name: body.name || body.file, mode: body.mode };
      }
    }
  }

  return { name: null, mode: modeFromQuery };
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
