import type { ReadStream } from "node:fs";

/** Job lifecycle status. Terminal: completed, failed, cancelled. */
export type PublicJobStatus =
	| "queued"
	| "processing"
	| "completed"
	| "failed"
	| "cancelled"
	| string;

/**
 * Processing mode.
 * API defaults to deferred when omitted. `asynchronous` is treated as deferred.
 * Synchronous has an API size cap (default 512 MiB); use deferred for larger files.
 */
export type ServiceMode = "synchronous" | "asynchronous" | "deferred" | string;

export interface V1Job {
	/** Id from createJob / transcribeFile. */
	id : string;
	status : PublicJobStatus;
	model ?: string | null;
	service_mode ?: ServiceMode | null;
	/** Two-letter ISO language code (e.g. 'en', 'es'). */
	language ?: string | null;
	/** Full text when status is completed; otherwise null/absent. */
	transcript ?: string | null;
	/** Audio duration in seconds, when known. */
	duration ?: number | null;
	created_at ?: string | null;
	completed_at ?: string | null;
	/** Failure message when status is failed. */
	error ?: string | null;
	/** 0–100 while processing, when the API reports it. */
	progress ?: number | null;
	/** Coarse pipeline stage label while processing. */
	stage ?: string | null;
}

export interface PresignResponse {
	/** Short-lived URL for a PUT of the audio bytes. */
	upload_url : string;
	/** Pass to createJob as object_key after a successful PUT. */
	object_key : string;
	/** Seconds until upload_url expires. */
	expires_in : number;
	file_id ?: string;
	filename ?: string;
}

/** Ack from job creation — no transcript yet; poll getJob or waitForJob. */
export interface CreateJobResponse {
	id : string;
	status : PublicJobStatus;
	model ?: string | null;
	service_mode ?: ServiceMode | null;
	language ?: string | null;
	created_at ?: string | null;
}

export interface CancelJobResponse {
	success : boolean;
	status : string;
}

export interface ListJobsResponse {
	data ?: V1Job[];
	pagination ?: {
		page ?: number;
		limit ?: number;
		total ?: number;
		[key : string] : unknown;
	};
	[key : string] : unknown;
}

export interface SpeechWeaveClientOptions {
	/** Falls back to SPEECHWEAVE_API_KEY. Required if the env var is unset. */
	api_key ?: string;
	/** Defaults to https://api.speechweave.com/v1. */
	base_url ?: string;
	/** Override global fetch (tests, custom agents). */
	fetch_func ?: typeof fetch;
}

/** Normalized upload body + MIME type for low-level PUT helpers. */
export interface UploadBodyResult {
    
	body : Buffer | Blob | ReadStream;
	content_type : string;
    
}
