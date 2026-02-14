"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlToBinary = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class UrlToBinary {
    constructor() {
        this.description = {
            displayName: 'URL to Binary',
            name: 'urlToBinary',
            icon: 'file:urlToBinary.svg',
            group: ['input'],
            version: 1,
            description: 'Download a file from URL and output as binary data',
            defaults: {
                name: 'URL to Binary',
            },
            inputs: ['main'],
            outputs: ['main'],
            properties: [
                {
                    displayName: 'URL',
                    name: 'url',
                    type: 'string',
                    default: '',
                    required: true,
                    placeholder: 'https://example.com/audio.mp3',
                    description: 'URL of the file to download',
                },
                {
                    displayName: 'Output Binary Property',
                    name: 'outputBinaryPropertyName',
                    type: 'string',
                    default: 'data',
                    description: 'Name of the binary property for the downloaded file',
                },
                {
                    displayName: 'Options',
                    name: 'options',
                    type: 'collection',
                    placeholder: 'Add Option',
                    default: {},
                    options: [
                        {
                            displayName: 'File Name',
                            name: 'fileName',
                            type: 'string',
                            default: '',
                            description: 'Override the file name (derived from URL by default)',
                        },
                        {
                            displayName: 'MIME Type',
                            name: 'mimeType',
                            type: 'string',
                            default: '',
                            description: 'Override the MIME type (auto-detected by default)',
                        },
                    ],
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            const url = this.getNodeParameter('url', i);
            const outputBinaryPropertyName = this.getNodeParameter('outputBinaryPropertyName', i);
            const options = this.getNodeParameter('options', i, {});
            try {
                const buffer = await this.helpers.httpRequest({
                    url,
                    method: 'GET',
                    encoding: 'arraybuffer',
                });
                // Determine file name from option or URL path
                let fileName = options.fileName || '';
                if (!fileName) {
                    try {
                        const urlObj = new URL(url);
                        const pathParts = urlObj.pathname.split('/');
                        fileName = decodeURIComponent(pathParts[pathParts.length - 1]) || 'download';
                    }
                    catch {
                        fileName = 'download';
                    }
                }
                const binaryData = await this.helpers.prepareBinaryData(buffer, fileName, options.mimeType || undefined);
                returnData.push({
                    json: {
                        url,
                        fileName,
                        fileSize: buffer.length,
                        mimeType: binaryData.mimeType,
                    },
                    binary: {
                        [outputBinaryPropertyName]: binaryData,
                    },
                    pairedItem: { item: i },
                });
            }
            catch (err) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to download from URL: ${err.message}`, { itemIndex: i });
            }
        }
        return [returnData];
    }
}
exports.UrlToBinary = UrlToBinary;
//# sourceMappingURL=UrlToBinary.node.js.map