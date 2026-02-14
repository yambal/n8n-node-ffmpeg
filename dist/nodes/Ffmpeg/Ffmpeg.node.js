"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ffmpeg = void 0;
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
class Ffmpeg {
    constructor() {
        this.description = {
            displayName: 'FFmpeg',
            name: 'ffmpeg',
            icon: 'file:ffmpeg.svg',
            group: ['transform'],
            version: 1,
            subtitle: '={{$parameter["operation"]}}',
            description: 'Process audio files using FFmpeg',
            defaults: {
                name: 'FFmpeg',
            },
            inputs: ['main'],
            outputs: ['main'],
            properties: [
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'Convert',
                            value: 'convert',
                            description: 'Convert audio to a different format',
                            action: 'Convert audio format',
                        },
                        {
                            name: 'Change Bitrate',
                            value: 'changeBitrate',
                            description: 'Change audio bitrate',
                            action: 'Change audio bitrate',
                        },
                        {
                            name: 'Mix Narration with BGM',
                            value: 'mixNarrationBgm',
                            description: 'Mix narration audio with background music',
                            action: 'Mix narration with BGM',
                        },
                    ],
                    default: 'convert',
                },
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
                        { name: 'MP3', value: 'mp3' },
                        { name: 'WAV', value: 'wav' },
                        { name: 'OGG', value: 'ogg' },
                        { name: 'FLAC', value: 'flac' },
                        { name: 'AAC', value: 'aac' },
                        { name: 'M4A', value: 'm4a' },
                    ],
                    default: 'mp3',
                    description: 'Output audio format',
                    displayOptions: {
                        show: {
                            operation: ['convert'],
                        },
                    },
                },
                {
                    displayName: 'Bitrate',
                    name: 'bitrate',
                    type: 'options',
                    options: [
                        { name: '64 kbps', value: '64k' },
                        { name: '128 kbps', value: '128k' },
                        { name: '192 kbps', value: '192k' },
                        { name: '256 kbps', value: '256k' },
                        { name: '320 kbps', value: '320k' },
                    ],
                    default: '128k',
                    description: 'Audio bitrate',
                    displayOptions: {
                        show: {
                            operation: ['changeBitrate'],
                        },
                    },
                },
                {
                    displayName: 'Options',
                    name: 'options',
                    type: 'collection',
                    placeholder: 'Add Option',
                    default: {},
                    displayOptions: {
                        show: {
                            operation: ['convert'],
                        },
                    },
                    options: [
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
                            description: 'Audio bitrate (leave empty for auto)',
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
                            description: 'Audio sample rate (leave auto to keep original)',
                        },
                    ],
                },
                // Mix Narration with BGM parameters
                {
                    displayName: 'BGM Binary Property',
                    name: 'bgmBinaryPropertyName',
                    type: 'string',
                    default: 'bgm',
                    description: 'Name of the binary property containing the BGM audio file',
                    displayOptions: {
                        show: {
                            operation: ['mixNarrationBgm'],
                        },
                    },
                },
                {
                    displayName: 'Fade In Duration (seconds)',
                    name: 'fadeInSeconds',
                    type: 'number',
                    typeOptions: { minValue: 0, numberStepSize: 0.5 },
                    default: 2,
                    description: 'Duration for BGM to fade in from silence to full volume',
                    displayOptions: {
                        show: {
                            operation: ['mixNarrationBgm'],
                        },
                    },
                },
                {
                    displayName: 'Intro Duration (seconds)',
                    name: 'introSeconds',
                    type: 'number',
                    typeOptions: { minValue: 0, numberStepSize: 0.5 },
                    default: 3,
                    description: 'Duration of BGM at full volume (after fade in, before fade down)',
                    displayOptions: {
                        show: {
                            operation: ['mixNarrationBgm'],
                        },
                    },
                },
                {
                    displayName: 'Fade Down Duration (seconds)',
                    name: 'fadeDownSeconds',
                    type: 'number',
                    typeOptions: { minValue: 0, numberStepSize: 0.5 },
                    default: 2,
                    description: 'Duration for BGM to fade from full volume to BGM volume',
                    displayOptions: {
                        show: {
                            operation: ['mixNarrationBgm'],
                        },
                    },
                },
                {
                    displayName: 'BGM Volume',
                    name: 'bgmVolume',
                    type: 'number',
                    typeOptions: { minValue: 0, maxValue: 1, numberStepSize: 0.05 },
                    default: 0.15,
                    description: 'BGM volume during narration (0.0 to 1.0)',
                    displayOptions: {
                        show: {
                            operation: ['mixNarrationBgm'],
                        },
                    },
                },
                {
                    displayName: 'Fade Out Duration (seconds)',
                    name: 'fadeOutSeconds',
                    type: 'number',
                    typeOptions: { minValue: 0, numberStepSize: 0.5 },
                    default: 3,
                    description: 'Duration for BGM to fade out to silence after narration ends',
                    displayOptions: {
                        show: {
                            operation: ['mixNarrationBgm'],
                        },
                    },
                },
                {
                    displayName: 'Mix Output Format',
                    name: 'mixOutputFormat',
                    type: 'options',
                    options: [
                        { name: 'MP3', value: 'mp3' },
                        { name: 'WAV', value: 'wav' },
                        { name: 'OGG', value: 'ogg' },
                        { name: 'FLAC', value: 'flac' },
                        { name: 'AAC', value: 'aac' },
                        { name: 'M4A', value: 'm4a' },
                    ],
                    default: 'mp3',
                    description: 'Output audio format',
                    displayOptions: {
                        show: {
                            operation: ['mixNarrationBgm'],
                        },
                    },
                },
                {
                    displayName: 'Mix Output Bitrate',
                    name: 'mixBitrate',
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
                    description: 'Output audio bitrate (leave auto for default)',
                    displayOptions: {
                        show: {
                            operation: ['mixNarrationBgm'],
                        },
                    },
                },
                {
                    displayName: 'Normalize',
                    name: 'mixNormalize',
                    type: 'options',
                    options: [
                        { name: 'Off', value: '' },
                        { name: 'EBU R128 Loudness', value: 'loudnorm' },
                    ],
                    default: '',
                    description: 'Audio loudness normalization on the mixed output',
                    displayOptions: {
                        show: {
                            operation: ['mixNarrationBgm'],
                        },
                    },
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
            const operation = this.getNodeParameter('operation', i);
            const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
            const outputBinaryPropertyName = this.getNodeParameter('outputBinaryPropertyName', i);
            // Handle Mix Narration with BGM separately
            if (operation === 'mixNarrationBgm') {
                const bgmBinaryPropertyName = this.getNodeParameter('bgmBinaryPropertyName', i);
                const fadeInSeconds = this.getNodeParameter('fadeInSeconds', i);
                const introSeconds = this.getNodeParameter('introSeconds', i);
                const fadeDownSeconds = this.getNodeParameter('fadeDownSeconds', i);
                const bgmVolume = this.getNodeParameter('bgmVolume', i);
                const fadeOutSeconds = this.getNodeParameter('fadeOutSeconds', i);
                const mixOutputFormat = this.getNodeParameter('mixOutputFormat', i);
                const mixBitrate = this.getNodeParameter('mixBitrate', i);
                const mixNormalize = this.getNodeParameter('mixNormalize', i);
                // Get narration binary
                const narBinaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                const narBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                const narExt = getExtensionFromBinary(narBinaryData);
                // Get BGM binary
                const bgmBinaryData = this.helpers.assertBinaryData(i, bgmBinaryPropertyName);
                const bgmBuffer = await this.helpers.getBinaryDataBuffer(i, bgmBinaryPropertyName);
                const bgmExt = getExtensionFromBinary(bgmBinaryData);
                const id = (0, crypto_1.randomUUID)();
                const narPath = (0, path_1.join)((0, os_1.tmpdir)(), `ffmpeg_nar_${id}.${narExt}`);
                const bgmPath = (0, path_1.join)((0, os_1.tmpdir)(), `ffmpeg_bgm_${id}.${bgmExt}`);
                const outputPath = (0, path_1.join)((0, os_1.tmpdir)(), `ffmpeg_out_${id}.${mixOutputFormat}`);
                try {
                    await (0, promises_1.writeFile)(narPath, narBuffer);
                    await (0, promises_1.writeFile)(bgmPath, bgmBuffer);
                    // Get narration duration using ffprobe
                    let narDuration;
                    try {
                        const probeResult = await execFileAsync('ffprobe', [
                            '-v', 'error',
                            '-show_entries', 'format=duration',
                            '-of', 'default=noprint_wrappers=1:nokey=1',
                            narPath,
                        ]);
                        narDuration = parseFloat(probeResult.stdout.trim());
                    }
                    catch (err) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `ffprobe failed: ${err.stderr || err.message}`, { itemIndex: i });
                    }
                    // Calculate timing
                    // fadeIn -> intro (full vol) -> fadeDown -> narration + bgmVol -> fadeOut
                    const fadeInEnd = fadeInSeconds;
                    const introEnd = fadeInEnd + introSeconds;
                    const fadeDownEnd = introEnd + fadeDownSeconds;
                    const narDelay = fadeDownEnd;
                    const narEnd = narDelay + narDuration;
                    const totalDuration = narEnd + fadeOutSeconds;
                    const delayMs = Math.round(narDelay * 1000);
                    // Build volume expression for BGM envelope (inside-out):
                    // 0 ~ fadeInEnd: fade from 0 to 1.0
                    // fadeInEnd ~ introEnd: full volume (1.0)
                    // introEnd ~ fadeDownEnd: fade from 1.0 to bgmVolume
                    // fadeDownEnd ~ narEnd: bgmVolume
                    // narEnd ~ narEnd+fadeOutSeconds: fade from bgmVolume to 0
                    let volExpr = '0';
                    if (fadeOutSeconds > 0) {
                        volExpr = `if(lt(t,${narEnd + fadeOutSeconds}),${bgmVolume}*(1-(t-${narEnd})/${fadeOutSeconds}),${volExpr})`;
                    }
                    volExpr = `if(lt(t,${narEnd}),${bgmVolume},${volExpr})`;
                    if (fadeDownSeconds > 0) {
                        volExpr = `if(lt(t,${fadeDownEnd}),1.0-(1.0-${bgmVolume})*(t-${introEnd})/${fadeDownSeconds},${volExpr})`;
                    }
                    volExpr = `if(lt(t,${introEnd}),1.0,${volExpr})`;
                    if (fadeInSeconds > 0) {
                        volExpr = `if(lt(t,${fadeInEnd}),t/${fadeInSeconds},${volExpr})`;
                    }
                    // Build filter_complex
                    const mixChain = mixNormalize
                        ? `[nar][bgm]amix=inputs=2:duration=longest:normalize=0,${mixNormalize}[out]`
                        : `[nar][bgm]amix=inputs=2:duration=longest:normalize=0[out]`;
                    const filterComplex = `[0:a]adelay=${delayMs}:all=1[nar];` +
                        `[1:a]atrim=0:${totalDuration},asetpts=PTS-STARTPTS,volume='${volExpr}':eval=frame[bgm];` +
                        mixChain;
                    const args = [
                        '-i', narPath,
                        '-stream_loop', '-1',
                        '-i', bgmPath,
                        '-filter_complex', filterComplex,
                        '-map', '[out]',
                    ];
                    if (mixBitrate) {
                        args.push('-b:a', mixBitrate);
                    }
                    args.push('-y', outputPath);
                    try {
                        await execFileAsync('ffmpeg', args, { timeout: 300000 });
                    }
                    catch (err) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `FFmpeg failed: ${err.stderr || err.message}`, { itemIndex: i });
                    }
                    const outputBuffer = await (0, promises_1.readFile)(outputPath);
                    const mimeType = MIME_TYPES[mixOutputFormat] || 'application/octet-stream';
                    const fileName = replaceExtension(narBinaryData.fileName || 'mixed_audio', mixOutputFormat);
                    const outputBinary = await this.helpers.prepareBinaryData(outputBuffer, fileName, mimeType);
                    returnData.push({
                        json: {
                            operation,
                            narrationDuration: narDuration,
                            fadeInSeconds,
                            introSeconds,
                            fadeDownSeconds,
                            bgmVolume,
                            fadeOutSeconds,
                            totalDuration,
                            outputFormat: mixOutputFormat,
                            outputSize: outputBuffer.length,
                        },
                        binary: {
                            [outputBinaryPropertyName]: outputBinary,
                        },
                        pairedItem: { item: i },
                    });
                }
                finally {
                    await (0, promises_1.unlink)(narPath).catch(() => { });
                    await (0, promises_1.unlink)(bgmPath).catch(() => { });
                    await (0, promises_1.unlink)(outputPath).catch(() => { });
                }
                continue;
            }
            // Validate binary data exists
            const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
            const inputBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
            // Determine input extension from mime type or file name
            const inputExt = getExtensionFromBinary(binaryData);
            // Determine output extension
            let outputExt;
            if (operation === 'convert') {
                outputExt = this.getNodeParameter('outputFormat', i);
            }
            else {
                // changeBitrate: keep same format
                outputExt = inputExt;
            }
            // Create temp files
            const id = (0, crypto_1.randomUUID)();
            const inputPath = (0, path_1.join)((0, os_1.tmpdir)(), `ffmpeg_in_${id}.${inputExt}`);
            const outputPath = (0, path_1.join)((0, os_1.tmpdir)(), `ffmpeg_out_${id}.${outputExt}`);
            try {
                // Write input to temp file
                await (0, promises_1.writeFile)(inputPath, inputBuffer);
                // Build ffmpeg arguments
                const args = ['-i', inputPath];
                if (operation === 'convert') {
                    const options = this.getNodeParameter('options', i, {});
                    if (options.bitrate) {
                        args.push('-b:a', options.bitrate);
                    }
                    if (options.sampleRate) {
                        args.push('-ar', String(options.sampleRate));
                    }
                }
                else if (operation === 'changeBitrate') {
                    const bitrate = this.getNodeParameter('bitrate', i);
                    args.push('-b:a', bitrate);
                }
                args.push('-y', outputPath);
                // Execute ffmpeg
                try {
                    await execFileAsync('ffmpeg', args, { timeout: 120000 });
                }
                catch (err) {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), `FFmpeg failed: ${err.stderr || err.message}`, { itemIndex: i });
                }
                // Read output file and prepare binary data
                const outputBuffer = await (0, promises_1.readFile)(outputPath);
                const mimeType = MIME_TYPES[outputExt] || 'application/octet-stream';
                const fileName = replaceExtension(binaryData.fileName || 'audio', outputExt);
                const outputBinary = await this.helpers.prepareBinaryData(outputBuffer, fileName, mimeType);
                returnData.push({
                    json: {
                        operation,
                        inputFormat: inputExt,
                        outputFormat: outputExt,
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
                // Clean up temp files
                await (0, promises_1.unlink)(inputPath).catch(() => { });
                await (0, promises_1.unlink)(outputPath).catch(() => { });
            }
        }
        return [returnData];
    }
}
exports.Ffmpeg = Ffmpeg;
function getExtensionFromBinary(binary) {
    if (binary.fileName) {
        const parts = binary.fileName.split('.');
        if (parts.length > 1) {
            return parts.pop().toLowerCase();
        }
    }
    // Fallback: derive from mime type
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
//# sourceMappingURL=Ffmpeg.node.js.map