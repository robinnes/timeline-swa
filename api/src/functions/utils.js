module.exports = {
    extractConnectionStringParts: function(connectionString) {
        const parts = connectionString.split(';');
        let protocol, endpointSuffix, accountName, accountKey;

        for (const part of parts) {
            const [key, value] = part.split('=', 2);
            if (!key) continue;
            if (key === 'AccountName') accountName = value;
            if (key === 'AccountKey') accountKey = value;
            if (key === 'DefaultEndpointsProtocol') protocol = value;
            if (key === 'EndpointSuffix') endpointSuffix = value;
        }

        // Build URL after we've parsed all parts so accountName is available
        let url;
        if (protocol && accountName && endpointSuffix) {
            url = `${protocol}://${accountName}.blob.${endpointSuffix}`;
        } else if (protocol && accountName) {
            url = `${protocol}://${accountName}.blob.core.windows.net`;
        }

        return { accountName, accountKey, url };
    }
};