"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioConvert = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const child_process_1 = require("child_process");
const util_1 = require("util");
const promises_1 = require("fs/promises");
const os_1 = require("os");
const path_1 = require("path");
const crypto_1 = require("crypto");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const MIME_TYPES = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    aac: 'audio/aac',
    m4a: 'audio/mp4',
};
class AudioConvert {
    constructor() {
        this.description = {
            displayName: 'Audio Convert',
            name: 'audioConvert',
            icon: 'file:audioConvert.svg',
            group: ['transform'],
            version: 1,
            description: 'Convert audio format, bitrate, sample rate, and channels',
            defaults: {
                name: 'Audio Convert',
            },
            inputs: ['main'],
            outputs: ['main'],
            properties: [
                {
                    displayName: 'Binary Property',
                    name: 'binaryPropertyName',
                    type: 'string',
                    default: 'data',
                    description: 'Name of the binary property containing the input audio file',
                },
                {
                    displayName: 'Output Format',
                    name: 'outputFormat',
                    type: 'options',
                    options: [
                        { name: 'Keep Original', value: '' },
                        { name: 'MP3', value: 'mp3' },
                        { name: 'WAV', value: 'wav' },
                        { name: 'OGG', value: 'ogg' },
                        { name: 'FLAC', value: 'flac' },
                        { name: 'AAC', value: 'aac' },
                        { name: 'M4A', value: 'm4a' },
                    ],
                    default: '',
                    description: 'Output audio format (keep original to preserve format)',
                },
                {
                    displayName: 'Bitrate',
                    name: 'bitrate',
                    type: 'options',
                    options: [
                        { name: 'Auto', value: '' },
                        { name: '64 kbps', value: '64k' },
                        { name: '128 kbps', value: '128k' },
                        { name: '192 kbps', value: '192k' },
                        { name: '256 kbps', value: '256k' },
                        { name: '320 kbps', value: '320k' },
                    ],
                    default: '',
                    description: 'Audio bitrate',
                },
                {
                    displayName: 'Sample Rate',
                    name: 'sampleRate',
                    type: 'options',
                    options: [
                        { name: 'Auto', value: 0 },
                        { name: '22050 Hz', value: 22050 },
                        { name: '44100 Hz', value: 44100 },
                        { name: '48000 Hz', value: 48000 },
                    ],
                    default: 0,
                    description: 'Audio sample rate',
                },
                {
                    displayName: 'Channels',
                    name: 'channels',
                    type: 'options',
                    options: [
                        { name: 'Auto', value: 0 },
                        { name: 'Mono', value: 1 },
                        { name: 'Stereo', value: 2 },
                    ],
                    default: 0,
                    description: 'Number of audio channels',
                },
                {
                    displayName: 'Output Binary Property',
                    name: 'outputBinaryPropertyName',
                    type: 'string',
                    default: 'data',
                    description: 'Name of the binary property for the output audio file',
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
            const outputBinaryPropertyName = this.getNodeParameter('outputBinaryPropertyName', i);
            const outputFormat = this.getNodeParameter('outputFormat', i);
            const bitrate = this.getNodeParameter('bitrate', i);
            const sampleRate = this.getNodeParameter('sampleRate', i);
            const channels = this.getNodeParameter('channels', i);
            const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
            const inputBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
            const inputExt = getExtensionFromBinary(binaryData);
            const outputExt = outputFormat || inputExt;
            const id = (0, crypto_1.randomUUID)();
            const inputPath = (0, path_1.join)((0, os_1.tmpdir)(), `ffmpeg_in_${id}.${inputExt}`);
            const outputPath = (0, path_1.join)((0, os_1.tmpdir)(), `ffmpeg_out_${id}.${outputExt}`);
            try {
                await (0, promises_1.writeFile)(inputPath, inputBuffer);
                const args = ['-i', inputPath];
                if (bitrate) {
                    args.push('-b:a', bitrate);
                }
                if (sampleRate) {
                    args.push('-ar', String(sampleRate));
                }
                if (channels) {
                    args.push('-ac', String(channels));
                }
                args.push('-y', outputPath);
                try {
                    await execFileAsync('ffmpeg', args, { timeout: 120000 });
                }
                catch (err) {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), `FFmpeg failed: ${err.stderr || err.message}`, { itemIndex: i });
                }
                const outputBuffer = await (0, promises_1.readFile)(outputPath);
                const mimeType = MIME_TYPES[outputExt] || 'application/octet-stream';
                const fileName = replaceExtension(binaryData.fileName || 'audio', outputExt);
                const outputBinary = await this.helpers.prepareBinaryData(outputBuffer, fileName, mimeType);
                returnData.push({
                    json: {
                        inputFormat: inputExt,
                        outputFormat: outputExt,
                        bitrate: bitrate || 'auto',
                        sampleRate: sampleRate || 'auto',
                        channels: channels || 'auto',
                        inputSize: inputBuffer.length,
                        outputSize: outputBuffer.length,
                    },
                    binary: {
                        [outputBinaryPropertyName]: outputBinary,
                    },
                    pairedItem: { item: i },
                });
            }
            finally {
                await (0, promises_1.unlink)(inputPath).catch(() => { });
                await (0, promises_1.unlink)(outputPath).catch(() => { });
            }
        }
        return [returnData];
    }
}
exports.AudioConvert = AudioConvert;
function getExtensionFromBinary(binary) {
    if (binary.fileName) {
        const parts = binary.fileName.split('.');
        if (parts.length > 1) {
            return parts.pop().toLowerCase();
        }
    }
    const mimeMap = {
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
        'audio/x-wav': 'wav',
        'audio/ogg': 'ogg',
        'audio/flac': 'flac',
        'audio/aac': 'aac',
        'audio/mp4': 'm4a',
    };
    return mimeMap[binary.mimeType] || 'bin';
}
function replaceExtension(fileName, newExt) {
    const dotIndex = fileName.lastIndexOf('.');
    const baseName = dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
    return `${baseName}.${newExt}`;
}
//# sourceMappingURL=AudioConvert.node.js.map