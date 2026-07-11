/**
 * AssemblyAI-shaped transcripts helpers.
 * Prefer the official AssemblyAI SDK with SpeechWeave when migrating.
 */
import type { ReadStream } from "node:fs";
import type { SpeechWeaveClient } from "../client.js";
import {
	createJobFromUrl,
	finishCompatJob,
	shapeAssemblyResponse,
	uploadAndCreateJob,
	type UploadBody,
} from "../compat_shapes.js";

export interface AssemblyTranscribeConfig {
	model ?: string;
	language ?: string;
	// Explicit Content-Length when the body cannot be measured
	file_size ?: number;
}

export function createAssemblyTranscriptsNamespace(
	client : SpeechWeaveClient,
) {

	return {
		/** AssemblyAI-shaped transcription — drop-in compatibility wrapper. Pass a URL string or binary/file body. */
		transcribe: async (
			audio : string | UploadBody | ReadStream,
			config ?: AssemblyTranscribeConfig,
			options : { wait ?: boolean } = {},
		) => {

			const cfg = config || {};
			const wait = options.wait ?? true;

			let job;
			if ( typeof audio === "string" ) {

				job = await createJobFromUrl( client, {
					url: audio,
					model: cfg.model,
					language: cfg.language,
				} );
			
			}
			else {

				job = await uploadAndCreateJob( client, {
					data: audio,
					filename: "audio.bin",
					model: cfg.model,
					language: cfg.language,
					file_size: cfg.file_size,
				} );
			
			}

			const finished = await finishCompatJob( client, job, {
				wait,
				error_code: "ASSEMBLY_PROXY",
			} );
			if ( ! wait ) {

				return finished;
			
			}

			return shapeAssemblyResponse( finished as Record<string, unknown> );
		
		},
	};

}
