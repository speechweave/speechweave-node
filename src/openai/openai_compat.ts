/**
 * OpenAI-shaped transcription helpers.
 * For OpenAI migration, prefer the official `openai` package with `baseURL` set to SpeechWeave.
 */
import type { SpeechWeaveClient } from "../client.js";
import {
	finishCompatJob,
	shapeOpenAiResponse,
	uploadAndCreateJob,
	type UploadBody,
} from "../compat_shapes.js";

export interface OpenAiTranscriptionCreateOptions {
	file : UploadBody;
	filename ?: string;
	model ?: string;
	language ?: string;
	// Explicit Content-Length when the body cannot be measured.
	file_size ?: number;
	// When false, return the created job without polling (default true).
	wait ?: boolean;
}

export function createOpenAiAudioNamespace(
	client : SpeechWeaveClient,
) {

	return {
		transcriptions: {
			/** OpenAI-shaped transcription create — drop-in compatibility wrapper. */
			create: async ( opts : OpenAiTranscriptionCreateOptions ) => {

				const name = opts.filename || "audio.bin";
				const job = await uploadAndCreateJob( client, {
					data: opts.file,
					filename: name,
					model: opts.model,
					language: opts.language,
					file_size: opts.file_size,
				} );
				const finished = await finishCompatJob( client, job, {
					wait: opts.wait ?? true,
					error_code: "OPENAI_PROXY",
				} );
				if ( opts.wait === false ) {

					return finished;
				
				}

				return shapeOpenAiResponse( finished as Record<string, unknown> );
			
			},
		},
	};

}
