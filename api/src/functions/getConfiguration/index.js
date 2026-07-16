const { app } = require('@azure/functions');

const {
  canPublish,
  canUseThumbnails,
  getUserRoles
} = require("../authorization");

app.http('getConfiguration', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {

    const roles = await getUserRoles(request);

    return {
      status: 200,
      jsonBody: {
        environment: process.env.APP_ENVIRONMENT,
        roles,
        canPublish: await canPublish(request),
        canUseThumbnails: await canUseThumbnails(request)
      }
    };
  }
});