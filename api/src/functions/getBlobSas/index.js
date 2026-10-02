const { app } = require('@azure/functions');

const {
  json,
  badRequest,
  unauthorized,
  serverError,
  requireUsernameFolderKey,
  requireSafeFilename,
  generateBlobSas
} = require('../utils');

//const { canUseThumbnails } = require("../authorization");

app.http('getBlobSas', {
  methods: ['GET'], 
  authLevel: 'anonymous', // SWA enforces auth via staticwebapp.config.json routes
  handler: async (request, context) => {
    try {
      const conn = process.env.TIMELINE_STORAGE_CONN;
      const containerName = process.env.TIMELINE_STORAGE_CONTAINER;  //'timelines';
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
          // Authenticated identity from SWA -> userKey derived from principal.userId (Auth0: "auth0|...")
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

