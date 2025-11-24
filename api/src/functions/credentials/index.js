const { app } = require('@azure/functions');

const { 
    StorageSharedKeyCredential,
    ContainerSASPermissions,
    generateBlobSASQueryParameters
} = require("@azure/storage-blob");

const { extractConnectionStringParts } = require('../utils');

app.http('credentials', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        // read (r), create (c), write (w), list (l)
        const permissions = 'rlcw';
        const container = 'timelines';

        // locally, this is in local.settings.json; on prod in the Static Web App's Environment variables
        const conn = process.env.TIMELINE_STORAGE_CONN;
        try {
            const payload = generateSasToken(conn, container, permissions);
            return {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            };
        } catch (err) {
            context.log.error('Error generating SAS token', err);
            return {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Failed to generate SAS token', detail: err.message })
            };
        }
    }
});

function generateSasToken(connectionString, container, permissions) {
    const { accountKey, accountName, url } = extractConnectionStringParts(connectionString);
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey.toString('base64'));

    var expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 2);

    const sasKey = generateBlobSASQueryParameters({
        containerName: container,
        permissions: ContainerSASPermissions.parse(permissions),
        expiresOn: expiryDate,
    }, sharedKeyCredential);

    return {
        sasKey: sasKey.toString(),
        url: url
    };
}