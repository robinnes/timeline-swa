const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');
const zlib = require('zlib');

const {
  json,
  badRequest,
  unauthorized,
  serverError,
  requireUsernameFolderKey,
  requireSafeFilename,
  privatePrefixForUsername,
  publicPrefixForUsername
} = require('../utils');

app.http('deleteOrphanedImages', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const { scope, timelineFile } = await request.json().catch(() => ({}));
      if (!['private', 'public'].includes(scope)) return badRequest('Invalid scope.');
      if (!timelineFile) return badRequest('Missing timelineFile.');

      let filename;
      try {
        filename = requireSafeFilename(timelineFile);
      } catch (e) {
        return badRequest(e.message);
      }

      let usernameKey;
      try {
        usernameKey = await requireUsernameFolderKey(request);
      } catch (e) {
        return unauthorized(e.message);
      }

      const conn = process.env.TIMELINE_STORAGE_CONN;
      const container = BlobServiceClient
        .fromConnectionString(conn)
        .getContainerClient('timelines');

      const base =
        scope === 'private'
          ? privatePrefixForUsername(usernameKey)
          : publicPrefixForUsername(usernameKey);

      const timelineStem = filename.replace(/\.json(\.gz)?$/i, '');
      const timelineBlobName = `${base}${filename}`;
      const imagePrefix = `${base}${timelineStem}/`;

      const timelineClient = container.getBlockBlobClient(timelineBlobName);
      if (!(await timelineClient.exists())) {
        return badRequest('Timeline file does not exist.');
      }

      const compressed = await timelineClient.downloadToBuffer();
      const text = isGzip(compressed)
        ? zlib.gunzipSync(compressed).toString('utf8')
        : compressed.toString('utf8');

      const tl = JSON.parse(text);

      // build list of all image files referenced in tl (on items, tags and the tl itself)
      const referenced = collectReferencedImageBlobNames(tl, imagePrefix);

      let scanned = 0;
      let deleted = 0;

      for await (const blob of container.listBlobsFlat({ prefix: imagePrefix })) {
        scanned++;

        if (referenced.has(blob.name)) continue;

        await container.getBlobClient(blob.name).deleteIfExists();
        deleted++;
      }

      return json(200, {
        ok: true,
        scope,
        timelineFile: filename,
        scanned,
        deleted
      });

    } catch (err) {
      context.log.error('deleteOrphanedImages failed', err);
      return serverError('Failed to delete orphaned images', err);
    }
  }
});

function isGzip(buffer) {
  return buffer?.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

function collectReferencedImageBlobNames(tl, imagePrefix) {
  const files = [
    tl.image?.file,
    ...(tl.tags ?? []).map(tag => tag.image?.file),
    ...(tl.items ?? []).map(item => item.image?.file)
  ];

  return new Set(
    files
      .filter(Boolean)
      .map(file => `${imagePrefix}${file}`)
  );
}