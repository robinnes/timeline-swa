const { app } = require('@azure/functions');

// Setup the function app
app.setup({
    enableHttpStream: true,
});

// Register all function modules
require('./functions/credentials/index.js');
require('./functions/getTimeline/index.js');
require('./functions/getBlobSas/index.js');
require('./functions/listTimelines/index.js');
