import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

const execFileAsync = promisify(execFile);

const MIME_TYPES: Record<string, string> = {
	mp3: 'audio/mpeg',
	wav: 'audio/wav',
	ogg: 'audio/ogg',
	flac: 'audio/flac',
	aac: 'audio/aac',
	m4a: 'audio/mp4',
};

export class Ffmpeg implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FFmpeg',
		name: 'ffmpeg',
		icon: 'file:ffmpeg.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Convert audio files using FFmpeg',
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
			{
				displayName: 'Output Binary Property',
				name: 'outputBinaryPropertyName',
				type: 'string',
				default: 'data',
				description: 'Name of the binary property for the output audio file',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
			const outputBinaryPropertyName = this.getNodeParameter('outputBinaryPropertyName', i) as string;

			// Validate binary data exists
			const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
			const inputBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

			// Determine input extension from mime type or file name
			const inputExt = getExtensionFromBinary(binaryData);

			// Determine output extension
			let outputExt: string;
			if (operation === 'convert') {
				outputExt = this.getNodeParameter('outputFormat', i) as string;
			} else {
				// changeBitrate: keep same format
				outputExt = inputExt;
			}

			// Create temp files
			const id = randomUUID();
			const inputPath = join(tmpdir(), `ffmpeg_in_${id}.${inputExt}`);
			const outputPath = join(tmpdir(), `ffmpeg_out_${id}.${outputExt}`);

			try {
				// Write input to temp file
				await writeFile(inputPath, inputBuffer);

				// Build ffmpeg arguments
				const args = ['-i', inputPath];

				if (operation === 'convert') {
					const options = this.getNodeParameter('options', i, {}) as {
						bitrate?: string;
						sampleRate?: number;
					};
					if (options.bitrate) {
						args.push('-b:a', options.bitrate);
					}
					if (options.sampleRate) {
						args.push('-ar', String(options.sampleRate));
					}
				} else if (operation === 'changeBitrate') {
					const bitrate = this.getNodeParameter('bitrate', i) as string;
					args.push('-b:a', bitrate);
				}

				args.push('-y', outputPath);

				// Execute ffmpeg
				try {
					await execFileAsync('ffmpeg', args, { timeout: 120_000 });
				} catch (err: any) {
					throw new NodeOperationError(
						this.getNode(),
						`FFmpeg failed: ${err.stderr || err.message}`,
						{ itemIndex: i },
					);
				}

				// Read output file and prepare binary data
				const outputBuffer = await readFile(outputPath);
				const mimeType = MIME_TYPES[outputExt] || 'application/octet-stream';
				const fileName = replaceExtension(binaryData.fileName || 'audio', outputExt);

				const outputBinary = await this.helpers.prepareBinaryData(
					outputBuffer,
					fileName,
					mimeType,
				);

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
			} finally {
				// Clean up temp files
				await unlink(inputPath).catch(() => {});
				await unlink(outputPath).catch(() => {});
			}
		}

		return [returnData];
	}
}

function getExtensionFromBinary(binary: { fileName?: string; mimeType: string }): string {
	if (binary.fileName) {
		const parts = binary.fileName.split('.');
		if (parts.length > 1) {
			return parts.pop()!.toLowerCase();
		}
	}
	// Fallback: derive from mime type
	const mimeMap: Record<string, string> = {
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

function replaceExtension(fileName: string, newExt: string): string {
	const dotIndex = fileName.lastIndexOf('.');
	const baseName = dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
	return `${baseName}.${newExt}`;
}
