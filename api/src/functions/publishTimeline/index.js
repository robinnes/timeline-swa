const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

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

app.http('publishTimeline', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const conn = process.env.TIMELINE_STORAGE_CONN;
      const containerName = process.env.TIMELINE_STORAGE_CONTAINER;

      let usernameKey;
      try {
        usernameKey = await requireUsernameFolderKey(request);
      } catch (e) {
        return unauthorized(e.message);
      }

      const body = await request.json().catch(() => ({}));
      const timelineFile = body?.timelineFile || body?.file || body?.name;

      if (!timelineFile) return badRequest('Missing timelineFile.');

      let safeTimelineFile;
      try {
        safeTimelineFile = requireSafeFilename(timelineFile);
      } catch (e) {
        return badRequest(e.message);
      }

      const timelineStem = safeTimelineFile.replace(/\.json\.gz$/i, '');

      const service = BlobServiceClient.fromConnectionString(conn);
      const container = service.getContainerClient(containerName);

      const privateBase = privatePrefixForUsername(usernameKey);
      const publicBase = publicPrefixForUsername(usernameKey);

      const privateTimelineName = `${privateBase}${safeTimelineFile}`;
      const publicTimelineName = `${publicBase}${safeTimelineFile}`;

      const privateImagePrefix = `${privateBase}${timelineStem}/`;
      const publicImagePrefix = `${publicBase}${timelineStem}/`;

      const privateTimeline = container.getBlobClient(privateTimelineName);
      const publicTimeline = container.getBlobClient(publicTimelineName);

      if (!(await privateTimeline.exists())) {
        return badRequest('Private timeline file does not exist.');
      }

      // 1. Promote timeline JSON.
      //await publicTimeline.syncCopyFromURL(privateTimeline.url);
      await copyBlob(container, privateTimelineName, publicTimelineName);

      // 2. Reconcile image folder.
      const privateImages = new Set();
      const publicImages = new Set();

      for await (const blob of container.listBlobsFlat({ prefix: privateImagePrefix })) {
        const relativeName = blob.name.slice(privateImagePrefix.length);
        if (relativeName) privateImages.add(relativeName);
      }

      for await (const blob of container.listBlobsFlat({ prefix: publicImagePrefix })) {
        const relativeName = blob.name.slice(publicImagePrefix.length);
        if (relativeName) publicImages.add(relativeName);
      }

      let copiedImages = 0;
      let deletedImages = 0;

      for (const relativeName of privateImages) {
        const sourceName = privateImagePrefix + relativeName;
        const destName = publicImagePrefix + relativeName;

        const sourceClient = container.getBlobClient(sourceName);
        const destClient = container.getBlobClient(destName);

        //await destClient.syncCopyFromURL(sourceClient.url);
        await copyBlob(container, sourceName, destName);
        copiedImages++;
      }

      for (const relativeName of publicImages) {
        if (privateImages.has(relativeName)) continue;

        const staleClient = container.getBlobClient(publicImagePrefix + relativeName);
        await staleClient.deleteIfExists();
        deletedImages++;
      }

      return json(200, {
        ok: true,
        timelineFile: safeTimelineFile,
        copiedTimeline: true,
        copiedImages,
        deletedImages
      });

    } catch (err) {
      context.log.error('publishTimeline failed', err);
      return serverError('Failed to publish timeline', err);
    }
  }
});

async function copyBlob(container, sourceName, destName, overrides = {}) {
  const sourceClient = container.getBlockBlobClient(sourceName);
  const destClient = container.getBlockBlobClient(destName);

  const [data, props] = await Promise.all([
    sourceClient.downloadToBuffer(),
    sourceClient.getProperties()
  ]);

  await destClient.uploadData(data, {
    blobHTTPHeaders: {
      blobContentType: props.contentType,
      blobContentEncoding: props.contentEncoding,
      ...overrides
    }
  });
}