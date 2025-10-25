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
        const permissions = 'r';  // read only
        const container = 'timelines';

        // Validate that the storage connection string is available. Some portal
        // environments (Static Web Apps) may restrict creating a setting named
        // AzureWebJobsStorage. Allow a custom setting name (TIMELINE_STORAGE_CONN)
        // and fall back to AzureWebJobsStorage if present.
        const conn = process.env.TIMELINE_STORAGE_CONN || process.env.AzureWebJobsStorage;
        if (!conn) {
            context.log.error('Storage connection string not set (TIMELINE_STORAGE_CONN or AzureWebJobsStorage)');
            return {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Server configuration error: storage connection string not set' })
            };
        }

        try {
            const payload = generateSasToken(conn, container, permissions);
            return {
                headers: {
                    'Content-Type': 'application/json'
                },
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