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
 * Synchronous has its own size cap, at or below the account cap; see {@link AccountLimits}.
 */
export type ServiceMode = "synchronous" | "asynchronous" | "deferred" | string;

/**
 * Upload ceilings in bytes for the calling API key, from `GET /v1/limits`.
 * These vary per account, so never hard-code them.
 */
export interface AccountLimits {
	/** Largest input this account may submit, in any mode. */
	max_input_bytes : number;
	/** Cap for service_mode 'synchronous'. Never above max_input_bytes. */
	sync_max_bytes : number;
	/** Cap for the OpenAI-compatible multipart proxy. Never above max_input_bytes. */
	proxy_max_bytes : number;
}

export type TranscriptionTask = "transcribe" | "translate";

/** OpenAI Whisper `response_format` values. */
export type TranscriptionResponseFormat = "json" | "text" | "srt" | "vtt" | "verbose_json";

export type TimestampGranularity = "segment" | "word";

/** A single timed transcript segment. */
export interface TranscriptSegment {
	start : number;
	end : number;
	text : string;
	[key : string] : unknown;
}

/** A single timed word (only present when `timestamp_granularities` included `"word"`). */
export interface TranscriptWord {
	word : string;
	start : number;
	end : number;
	[key : string] : unknown;
}

/** Shape returned by `GET /v1/jobs/:id?format=verbose_json` (and the sync proxy's `verbose_json` response). */
export interface VerboseTranscript {
	task : TranscriptionTask;
	language ?: string | null;
	duration ?: number | null;
	text : string;
	segments : TranscriptSegment[];
	words ?: TranscriptWord[];
}

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

/** Ack from job creation, no transcript yet; poll getJob or waitForJob. */
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
