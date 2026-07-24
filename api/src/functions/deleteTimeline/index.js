const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

const {
  json,
  badRequest,
  unauthorized,
  serverError,
  requireUsernameFolderKey,
  requireSafeFilename
} = require('../utils');

const TIMELINE_FILE_EXT = '.json.gz';

app.http('deleteTimeline', {
  methods: ['GET', 'DELETE'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const url = new URL(request.url);
      const scope = url.searchParams.get('scope');
      const selectedName = url.searchParams.get('name');

      if (!['private', 'public'].includes(scope) || !selectedName) {
        return badRequest('Provide ?scope=<private|public>&name=<timeline>.');
      }

      let usernameKey;
      try {
        usernameKey = await requireUsernameFolderKey(request);
      } catch (err) {
        return unauthorized(err.message);
      }

      const ownedName = getOwnedTimelineName(scope, selectedName, usernameKey);
      if (!ownedName) {
        return request.method === 'GET'
          ? json(200, { canDelete: false })
          : json(403, { error: 'You may delete only timelines in your own folder.' });
      }

      if (request.method === 'GET') {
        return json(200, { canDelete: true });
      }

      const conn = process.env.TIMELINE_STORAGE_CONN;
      const containerName = process.env.TIMELINE_STORAGE_CONTAINER;
      const container = BlobServiceClient.fromConnectionString(conn)
        .getContainerClient(containerName);

      const timelineFile = ensureTimelineExtension(ownedName);
      const timelineStem = removeTimelineExtension(ownedName);
      const basePrefix = `${scope}/${usernameKey}/`;
      const timelineBlobName = `${basePrefix}${timelineFile}`;
      const imagePrefix = `${basePrefix}${timelineStem}/`;

      let deletedImages = 0;
      for await (const blob of container.listBlobsFlat({ prefix: imagePrefix })) {
        const result = await container.deleteBlob(blob.name, { deleteSnapshots: 'include' });
        if (result.succeeded) deletedImages += 1;
      }

      const timelineResult = await container.deleteBlob(timelineBlobName, {
        deleteSnapshots: 'include'
      });

      if (!timelineResult.succeeded) {
        return json(404, { error: 'Timeline file not found.' });
      }

      return json(200, {
        deleted: true,
        timeline: selectedName,
        deletedImages
      });
    } catch (err) {
      context.log.error('Failed to delete timeline', err);
      return serverError('Failed to delete timeline', err);
    }
  }
});

function getOwnedTimelineName(scope, selectedName, usernameKey) {
  const normalized = String(selectedName).replaceAll('\\', '/').replace(/^\/+/, '');

  if (scope === 'private') {
    if (normalized.includes('/')) return null;
    return requireSafeFilename(normalized);
  }

  const ownerPrefix = `${usernameKey}/`;
  if (!normalized.startsWith(ownerPrefix)) return null;

  const relativeName = normalized.slice(ownerPrefix.length);
  if (!relativeName || relativeName.includes('/')) return null;
  return requireSafeFilename(relativeName);
}

function ensureTimelineExtension(name) {
  return name.endsWith(TIMELINE_FILE_EXT) ? name : `${name}${TIMELINE_FILE_EXT}`;
}

function removeTimelineExtension(name) {
  return name.endsWith(TIMELINE_FILE_EXT)
    ? name.slice(0, -TIMELINE_FILE_EXT.length)
    : name;
}
