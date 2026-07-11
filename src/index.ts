export { SpeechWeaveClient } from "./client.js";
export { SpeechWeaveError } from "./errors.js";
export { waitForJob } from "./polling.js";
export type { WaitForJobOptions } from "./polling.js";
export {
	createJobFromUrl,
	finishCompatJob,
	shapeAssemblyResponse,
	shapeDeepgramResponse,
	shapeOpenAiResponse,
	uploadAndCreateJob,
} from "./compat_shapes.js";
export type {
	CreateJobResponse,
	ListJobsResponse,
	PresignResponse,
	PublicJobStatus,
	ServiceMode,
	SpeechWeaveClientOptions,
	V1Job,
} from "./types.js";
export { VERSION } from "./version.js";
export { verifyWebhook } from "./webhooks.js";
export type { VerifyWebhookResult } from "./webhooks.js";

import { SpeechWeaveClient } from "./client.js";
import { createOpenAiAudioNamespace } from "./openai/openai_compat.js";
import { createDeepgramListenNamespace } from "./deepgram/deepgram_compat.js";
import { createAssemblyTranscriptsNamespace } from "./assembly/assembly_compat.js";
import type { ServiceMode, SpeechWeaveClientOptions } from "./types.js";

function createJobsNamespace(
	client : SpeechWeaveClient,
) {

	return {
		/**
		 * Create a job from a local file or a remote URL / object_key.
		 * Pass `file` (path, Buffer, Blob, or stream) to presign-upload then create.
		 * Otherwise pass one of `object_key`, `input_url`, or `audio_url` (no upload).
		 * Omitting service_mode leaves the API default (deferred).
		 */
		create: async ( params : {
			file ?: string | Buffer | Blob | import( "node:fs" ).ReadStream;
			filename ?: string;
			content_type ?: string;
			object_key ?: string;
			input_url ?: string;
			audio_url ?: string;
			model ?: string;
			service_mode ?: ServiceMode;
			language ?: string;
			type ?: string;
			metadata ?: Record<string, unknown>;
			file_size ?: number;
		} ) => {

			if ( params.file != null ) {

				if ( typeof params.file === "string" ) {

					return client.transcribeFilePath(
						params.file,
						{
							model: params.model,
							service_mode: params.service_mode,
							language: params.language,
							content_type: params.content_type,
							metadata: params.metadata,
							file_size: params.file_size,
						},
					);
				
				}

				return client.transcribeFile(
					params.file,
					{
						filename: params.filename,
						content_type: params.content_type,
						model: params.model,
						service_mode: params.service_mode,
						language: params.language,
						metadata: params.metadata,
						file_size: params.file_size,
					},
				);
			
			}

			return client.createJob( {
				object_key: params.object_key,
				input_url: params.input_url,
				audio_url: params.audio_url,
				model: params.model,
				service_mode: params.service_mode,
				language: params.language,
				type: params.type,
				metadata: params.metadata,
			} );
		
		},
		/** Fetch the current job record. */
		get: client.getJob.bind( client ),
		/** List jobs for the authenticated account. */
		list: client.listJobs.bind( client ),
		/**
		 * Cancel a pending or processing job.
		 * Fails if the job is already completed, failed, or cancelled.
		 */
		cancel: client.cancelJob.bind( client ),
	};

}

export class SpeechWeave extends SpeechWeaveClient {

	readonly audio : ReturnType<typeof createOpenAiAudioNamespace>;
	readonly listen : ReturnType<typeof createDeepgramListenNamespace>;
	readonly transcripts : ReturnType<typeof createAssemblyTranscriptsNamespace>;
	readonly jobs : ReturnType<typeof createJobsNamespace>;

	constructor( options : SpeechWeaveClientOptions = {} ) {

		super( options );
		this.audio = createOpenAiAudioNamespace( this );
		this.listen = createDeepgramListenNamespace( this );
		this.transcripts = createAssemblyTranscriptsNamespace( this );
		this.jobs = createJobsNamespace( this );
	
	}

}
