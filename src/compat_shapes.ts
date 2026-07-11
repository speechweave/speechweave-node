import type { ReadStream } from "node:fs";
import type { SpeechWeaveClient } from "./client.js";
import { SpeechWeaveError } from "./errors.js";
import { waitForJob } from "./polling.js";
import type { CreateJobResponse, ServiceMode, V1Job, UploadBodyResult } from "./types.js";

export type UploadBody = Buffer | Blob | ReadStream | Uint8Array;

function jobText(
	job : Record<string, unknown>,
) : string {

	const text = job.transcript;

	return typeof text === "string" ? text : "";

}

function jobDuration(
	job : Record<string, unknown>,
) : number | undefined {

	const duration = job.duration;
	if ( duration == null ) {

		return undefined;
	
	}
	const value = Number( duration );
	if ( ! Number.isFinite( value ) || value < 0 ) {

		return undefined;
	
	}

	return value;

}

function jobLanguage(
	job : Record<string, unknown>,
) : string | undefined {

	const language = job.language;
	if ( language == null ) {

		return undefined;
	
	}
	const text = String( language ).trim().toLowerCase();

	return text || undefined;

}

export function shapeOpenAiResponse(
	job : Record<string, unknown>,
) : {
	text : string;
	task : "transcribe";
	duration ?: number;
	language ?: string;
} {

	const response : {
		text : string;
		task : "transcribe";
		duration ?: number;
		language ?: string;
	} = {
		text: jobText( job ),
		task: "transcribe",
	};
	const duration = jobDuration( job );
	if ( duration !== undefined ) {

		response.duration = duration;
	
	}
	const language = jobLanguage( job );
	if ( language !== undefined ) {

		response.language = language;
	
	}

	return response;

}

export function shapeDeepgramResponse(
	job : Record<string, unknown>,
	options : { model ?: string | null } = {},
) : Record<string, unknown> {

	const job_id = String( job.id || "" );
	const model_name = options.model || String( job.model || "core" );
	const text = jobText( job );
	const language = jobLanguage( job );

	const alternative : Record<string, unknown> = {
		transcript: text,
		confidence: 1,
		words: [
		],
	};
	if ( language !== undefined ) {

		alternative.language = language;
	
	}

	return {
		metadata: {
			request_id: job_id,
			model_info: {
				name: model_name,
				version: "1",
				arch: "speechweave",
			},
		},
		results: {
			channels: [
				{
					alternatives: [
						alternative, 
					],
				},
			],
		},
	};

}

export function shapeAssemblyResponse(
	job : Record<string, unknown>,
) : Record<string, unknown> {

	const status = String( job.status || "unknown" );
	const pub_status = status === "completed" ? "completed" : status;
	const duration = jobDuration( job );
	const language = jobLanguage( job );
	const error = job.error;

	const response : Record<string, unknown> = {
		id: String( job.id || "" ),
		status: pub_status,
		text: jobText( job ),
	};
	if ( duration !== undefined ) {

		response.audio_duration = duration;
	
	}
	if ( language !== undefined ) {

		response.language = language;
	
	}
	if ( error != null && pub_status === "failed" ) {

		response.error = String( error );
	
	}
	else {

		response.error = null;
	
	}

	return response;

}

async function toUploadBody(
	data : UploadBody,
) : Promise<UploadBodyResult> {

	if ( data instanceof Blob ) {

		return {
			body: data,
			content_type: data.type || "application/octet-stream",
		};
	
	}
	if ( Buffer.isBuffer( data ) || data instanceof Uint8Array ) {

		const buf = Buffer.isBuffer( data ) ? data : Buffer.from( data );

		return {
			body: buf,
			content_type: "application/octet-stream",
		};
	
	}

	// Pass ReadStream through — putToPresignedUrl streams with duplex: "half".
	return {
		body: data,
		content_type: "application/octet-stream",
	};

}

export async function uploadAndCreateJob(
	client : SpeechWeaveClient,
	params : {
		data : UploadBody;
		filename : string;
		content_type ?: string;
		model ?: string;
		language ?: string;
		service_mode ?: ServiceMode;
		metadata ?: Record<string, unknown>;
		file_size ?: number;
	},
) : Promise<CreateJobResponse> {

	const prepared = await toUploadBody( params.data );
	const content_type = params.content_type || prepared.content_type;
	const body = prepared.body;

	const presign = await client.presignUpload( {
		filename: params.filename,
		content_type,
	} );
	await client.putToPresignedUrl(
		presign.upload_url,
		body as Buffer | Blob | ReadStream,
		content_type,
		{ file_size: params.file_size },
	);

	return client.createJob( {
		object_key: presign.object_key,
		model: params.model,
		language: params.language,
		service_mode: params.service_mode ?? "synchronous",
		metadata: params.metadata,
	} );

}

export async function createJobFromUrl(
	client : SpeechWeaveClient,
	params : {
		url : string;
		model ?: string;
		language ?: string;
		service_mode ?: ServiceMode;
		metadata ?: Record<string, unknown>;
	},
) : Promise<CreateJobResponse> {

	return client.createJob( {
		input_url: params.url,
		model: params.model,
		language: params.language,
		service_mode: params.service_mode ?? "synchronous",
		metadata: params.metadata,
	} );

}

export async function finishCompatJob(
	client : SpeechWeaveClient,
	job : CreateJobResponse | V1Job | Record<string, unknown>,
	options : {
		wait : boolean;
		error_code : string;
		timeout_ms ?: number;
		poll_ms ?: number;
	},
) : Promise<V1Job | CreateJobResponse | Record<string, unknown>> {

	if ( ! options.wait ) {

		return job;
	
	}

	const finished = await waitForJob(
		client,
		String( ( job as { id ?: string } ).id || "" ),
		{
			timeout_ms: options.timeout_ms ?? 300_000,
			poll_ms: options.poll_ms ?? 1_500,
		},
	);

	if ( String( finished.status ) === "failed" ) {

		throw new SpeechWeaveError(
			String( finished.error || "Transcription failed" ),
			500,
			options.error_code,
			finished,
		);
	
	}

	return finished;

}
