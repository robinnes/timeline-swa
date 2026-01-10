const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

const {
  json,
  badRequest,
  unauthorized,
  serverError,
  //requireUserKey,
  requireUsernameFolderKey,
  //privatePrefixForUserKey,
  privatePrefixForUsername
} = require('../utils');

app.http('listTimelines', {
  methods: ['GET'],
  authLevel: 'anonymous', // SWA route protection handles auth at the edge
  handler: async (request, context) => {
    try {
      const conn = process.env.TIMELINE_STORAGE_CONN;
      const containerName = 'timelines';
      const url = new URL(request.url);
      const public = url.searchParams.get('public');  // return list of public docs if 'public' parameter present
      let prefix = 'public/';

      if (!public) {
        let usernameKey;
        try {
          usernameKey = await requireUsernameFolderKey(request);
        } catch (e) {
          return unauthorized(e.message);
        }
        prefix = privatePrefixForUsername(usernameKey);
      }

      // Optional query params
      const ext = (url.searchParams.get('ext') || '.json').toLowerCase(); // default: only .json
      const max = clampInt(url.searchParams.get('max'), 1, 500, 200); // default 200

      const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
      const containerClient = blobServiceClient.getContainerClient(containerName);

      const results = [];
      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        // blob.name includes the prefix; strip it for the returned filename
        const filename = blob.name.startsWith(prefix) ? blob.name.slice(prefix.length) : blob.name;

        // Skip "folders" or weird entries (shouldn't happen, but safe)
        if (!filename || filename.endsWith('/')) continue;

        // Filter by extension (default .json)
        if (ext && !filename.toLowerCase().endsWith(ext)) continue;

        results.push({
          name: filename,
          // lastModified is a Date in node; serialize to ISO string for the client
          lastModified: blob.properties?.lastModified
            ? new Date(blob.properties.lastModified).toISOString()
            : null,
          size: typeof blob.properties?.contentLength === 'number' ? blob.properties.contentLength : null
        });

        if (results.length >= max) break;
      }

      // Sort newest-first by lastModified (nulls last)
      results.sort((a, b) => {
        const at = a.lastModified ? Date.parse(a.lastModified) : -Infinity;
        const bt = b.lastModified ? Date.parse(b.lastModified) : -Infinity;
        return bt - at;
      });

      return json(200, { prefix, items: results });
    } catch (err) {
      context.log.error('Error listing user timelines', err);
      return serverError('Failed to list timelines', err);
    }
  }
});

function clampInt(value, min, max, defaultValue) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return defaultValue;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
