const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

const {
  json,
  badRequest,
  unauthorized,
  permissions,
  serverError,
  requireUsernameFolderKey,
  requireSafeFilename,
  privatePrefixForUsername,
  publicPrefixForUsername
} = require('../utils');

const { canPublish } = require("../authorization");

app.http('publishTimeline', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {

    // check permissions
    if (!await canPublish(request)) {
      return permissions("A Pro account is required to publish timelines.");
    }

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

      // Read the timeline so its persistent ID can be used for
      // the public ID -> filename mapping.
      let timeline;

      try {
        timeline = await readTimeline(container, privateTimelineName);
      } catch (e) {
        return badRequest(`Unable to read timeline file: ${e.message}`);
      }

      const timelineId = timeline?.id;

      if (
        typeof timelineId !== 'string' ||
        !timelineId.trim()
      ) {
        return badRequest(
          'Timeline does not contain a valid timeline ID.'
        );
      }

      try {
        await validatePublicTimelineMapping(
          container,
          timelineId,
          publicBase
        );
      } catch (e) {
        return badRequest(e.message);
      }

      // 1. Promote timeline JSON.
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

      // 3. Publish the stable ID -> blob-name mapping.
      //
      // Do this last so the mapping never points to a timeline that
      // failed to publish.
      const mappingFile = await writePublicTimelineMapping(
        container,
        timelineId,
        publicTimelineName,
        publicBase
      );



      return json(200, {
        ok: true,
        timelineId,
        timelineFile: safeTimelineFile,
        mappingFile,
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


/***************** Index file handling ******************/

const PUBLIC_INDEX_PREFIX = 'public-index/';

async function readTimeline(container, blobName) {
  const client = container.getBlobClient(blobName);

  const buffer = await client.downloadToBuffer();

  /*
   * Timeline blobs are stored gzip-compressed. downloadToBuffer()
   * returns the stored bytes, so explicitly decompress them here.
   */
  const zlib = require('zlib');
  const text = zlib.gunzipSync(buffer).toString('utf8');

  return JSON.parse(text);
}

async function validatePublicTimelineMapping(
  container,
  timelineId,
  publicBase
) {
  const mappingName = `${PUBLIC_INDEX_PREFIX}${timelineId}.json`;
  const mappingClient = container.getBlobClient(mappingName);

  if (!(await mappingClient.exists())) {
    return;
  }

  const buffer = await mappingClient.downloadToBuffer();

  let existing;

  try {
    existing = JSON.parse(buffer.toString('utf8'));
  } catch {
    throw new Error(
      `Public timeline mapping "${mappingName}" is invalid.`
    );
  }

  if (
    typeof existing.file !== 'string' ||
    !existing.file.startsWith(publicBase)
  ) {
    throw new Error(
      `Timeline ID "${timelineId}" is already assigned to another public timeline.`
    );
  }
}

async function writePublicTimelineMapping(
  container,
  timelineId,
  publicTimelineName,
  publicBase
) {
  const mappingName = `${PUBLIC_INDEX_PREFIX}${timelineId}.json`;

  const mapping = JSON.stringify({
    file: publicTimelineName
  });

  const mappingClient =
    container.getBlockBlobClient(mappingName);

  try {
    /*
     * Create the mapping only if it does not already exist.
     *
     * This makes Azure Blob Storage arbitrate simultaneous attempts
     * to claim the same timeline ID.
     */
    await mappingClient.upload(
      mapping,
      Buffer.byteLength(mapping),
      {
        conditions: {
          ifNoneMatch: '*'
        },
        blobHTTPHeaders: {
          blobContentType: 'application/json; charset=utf-8'
        }
      }
    );

  } catch (err) {

    /*
     * 412 means somebody already owns this ID. This may simply
     * be this user's existing mapping, including a rename.
     */
    if (err.statusCode !== 412) {
      throw err;
    }

    const buffer = await mappingClient.downloadToBuffer();

    let existing;

    try {
      existing = JSON.parse(buffer.toString('utf8'));
    } catch {
      throw new Error(
        `Public timeline mapping "${mappingName}" is invalid.`
      );
    }

    /*
     * The existing mapping may be changed only if it belongs
     * to this user's public folder.
     */
    if (
      typeof existing.file !== 'string' ||
      !existing.file.startsWith(publicBase)
    ) {
      throw new Error(
        `Timeline ID "${timelineId}" is already assigned to another user's public timeline.`
      );
    }

    /*
     * This ID already belongs to this user. Update the mapping
     * if the timeline's filename/path has changed.
     */
    if (existing.file !== publicTimelineName) {
      await mappingClient.upload(
        mapping,
        Buffer.byteLength(mapping),
        {
          overwrite: true,
          blobHTTPHeaders: {
            blobContentType: 'application/json; charset=utf-8'
          }
        }
      );
    }
  }

  return mappingName;
}