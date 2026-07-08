const { app } = require('@azure/functions');

app.http('getConfiguration', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    return {
      status: 200,
      jsonBody: {
        environment: process.env.APP_ENVIRONMENT || 'production'
      }
    };
  }
});