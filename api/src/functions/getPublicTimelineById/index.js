const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

const {
  json,
  badRequest,
  serverError,
  generateBlobSas
} = require('../utils');

const PUBLIC_INDEX_PREFIX = 'public-index/';

app.http('getPublicTimelineById', {
  methods: ['GET'],
  authLevel: 'anonymous',

  handler: async (request, context) => {
    try {
      const conn = process.env.TIMELINE_STORAGE_CONN;
      const containerName = process.env.TIMELINE_STORAGE_CONTAINER;

      const url = new URL(request.url);
      const id = url.searchParams.get('id');

      if (!id) {
        return badRequest('Missing timeline ID. Provide ?id=<timeline-id>.');
      }

      /*
       * Timeline IDs are generated internally by OpenTL, but don't
       * permit the supplied value to become an arbitrary blob path.
       */
      if (!isValidTimelineId(id)) {
        return badRequest('Invalid timeline ID.');
      }

      const service =
        BlobServiceClient.fromConnectionString(conn);

      const container =
        service.getContainerClient(containerName);

      const mappingName =
        `${PUBLIC_INDEX_PREFIX}${id}.json`;

      const mappingClient =
        container.getBlobClient(mappingName);

      if (!(await mappingClient.exists())) {
        return notFound('Public timeline ID not found.');
      }

      const buffer =
        await mappingClient.downloadToBuffer();

      let mapping;

      try {
        mapping = JSON.parse(buffer.toString('utf8'));
      } catch {
        throw new Error(
          `Public timeline mapping "${mappingName}" is invalid.`
        );
      }

      /*
       * Never trust the mapping blindly. It must point into the
       * public area of the timeline container.
       */
      if (
        typeof mapping.file !== 'string' ||
        !mapping.file.startsWith('public/')
      ) {
        throw new Error(
          `Public timeline mapping "${mappingName}" contains an invalid file.`
        );
      }

      const payload = generateBlobSas(
        conn,
        containerName,
        mapping.file,
        'read'
      );

      return json(200, payload);

    } catch (err) {
      context.log.error(
        'Error resolving public timeline ID',
        err
      );

      return serverError(
        'Failed to resolve public timeline',
        err
      );
    }
  }
});


function isValidTimelineId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}