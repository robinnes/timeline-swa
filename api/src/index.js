const { app } = require('@azure/functions');

// Setup the function app
app.setup({
    enableHttpStream: true,
});

// Register all function modules
require('./functions/credentials/index.js');
require('./functions/getTimeline/index.js');
