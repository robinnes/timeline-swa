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
        const permissions = 'r';  // was c for uploading blobs (?)
        const container = 'timelines';  // was 'images';
        return {
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(generateSasToken(process.env.AzureWebJobsStorage, container, permissions))
            };
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