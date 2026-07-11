/**
 * Deepgram-shaped listen helpers.
 * Prefer the official Deepgram SDK with SpeechWeave base URL when migrating.
 */
import type { ReadStream } from "node:fs";
import type { SpeechWeaveClient } from "../client.js";
import {
	createJobFromUrl,
	finishCompatJob,
	shapeDeepgramResponse,
	uploadAndCreateJob,
	type UploadBody,
} from "../compat_shapes.js";

export interface DeepgramTranscribeFileOptions {
	model ?: string;
	filename ?: string;
	language ?: string;
	// Explicit Content-Length when the body cannot be measured
	file_size ?: number;
	// When false, return the created job without polling (default true).
	wait ?: boolean;
}

export interface DeepgramTranscribeUrlOptions {
	model ?: string;
	language ?: string;
	// When false, return the created job without polling (default true).
	wait ?: boolean;
}

export function createDeepgramListenNamespace(
	client : SpeechWeaveClient,
) {

	return {
		prerecorded: {
			/** Deepgram-shaped prerecorded file transcription — drop-in compatibility wrapper. */
			transcribeFile: async (
				stream : UploadBody | ReadStream,
				options : DeepgramTranscribeFileOptions = {},
			) => {

				const job = await uploadAndCreateJob( client, {
					data: stream,
					filename: options.filename || "audio.bin",
					model: options.model,
					language: options.language,
					file_size: options.file_size,
				} );
				const finished = await finishCompatJob( client, job, {
					wait: options.wait ?? true,
					error_code: "DEEPGRAM_PROXY",
				} );
				if ( options.wait === false ) {

					return finished;
				
				}

				return shapeDeepgramResponse(
					finished as Record<string, unknown>,
					{ model: options.model },
				);
			
			},
			/** Deepgram-shaped prerecorded URL transcription — drop-in compatibility wrapper. */
			transcribeUrl: async (
				url : string,
				options : DeepgramTranscribeUrlOptions = {},
			) => {

				const job = await createJobFromUrl( client, {
					url,
					model: options.model,
					language: options.language,
				} );
				const finished = await finishCompatJob( client, job, {
					wait: options.wait ?? true,
					error_code: "DEEPGRAM_PROXY",
				} );
				if ( options.wait === false ) {

					return finished;
				
				}

				return shapeDeepgramResponse(
					finished as Record<string, unknown>,
					{ model: options.model },
				);
			
			},
		},
	};

}
