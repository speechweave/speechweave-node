import { createReadStream } from "node:fs";
import type { ReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { SpeechWeaveError } from "./errors.js";
import { waitForJob } from "./polling.js";
import type {
	CreateJobResponse,
	CancelJobResponse,
	ListJobsResponse,
	PresignResponse,
	ServiceMode,
	SpeechWeaveClientOptions,
	V1Job,
} from "./types.js";
import { VERSION } from "./version.js";

function normalizeBaseURL(
	url : string,
) : string {

	const s = String( url || "" ).trim().replace( /\/+$/, "" );

	return s || "https://api.speechweave.com/v1";

}

async function readErrorMessage(
	response : Response,
) : Promise<string> {

	const content_type = response.headers.get( "content-type" ) || "";
	try {

		if ( content_type.includes( "application/json" ) ) {

			const json = ( await response.json() ) as { error ?: string;
				message ?: string; };

			return String( json?.error || json?.message || response.statusText );
		
		}
		const text = await response.text();

		return text.slice( 0, 500 ) || response.statusText;
	
	}
	catch {

		return response.statusText;
	
	}

}

async function getBodyLength(
	body : Buffer | ReadStream | Blob,
	file_size ?: number,
) : Promise<number | undefined> {

	if ( file_size != null && Number.isFinite( file_size ) && file_size >= 0 ) {

		return file_size;
	
	}
	if ( Buffer.isBuffer( body ) ) {

		return body.byteLength;
	
	}
	if ( body instanceof Blob ) {

		return body.size;
	
	}

	const path_like : unknown = ( body as ReadStream & { path ?: unknown } ).path;
	if (
		typeof path_like === "string"
		|| Buffer.isBuffer( path_like )
		|| path_like instanceof URL
	) {

		try {

			return ( await stat( path_like ) ).size;
		
		}
		catch {

			return undefined;
		
		}
	
	}

	return undefined;

}

/** Low-level SpeechWeave `/v1` client (presign, jobs, uploads). */
export class SpeechWeaveClient {

	protected readonly api_key : string;
	protected readonly base_url : string;
	protected readonly fetch_func : typeof fetch;

	/**
	 * @param options.api_key - Falls back to SPEECHWEAVE_API_KEY. Throws if neither is set.
	 * @param options.base_url - Defaults to https://api.speechweave.com/v1.
	 */
	constructor(
		options : SpeechWeaveClientOptions = {},
	) {

		this.api_key = (
			options.api_key
			|| (
				typeof process !== "undefined"
				&& process.env?.SPEECHWEAVE_API_KEY
			)
			|| ""
		);
		this.base_url = normalizeBaseURL(
			options.base_url || "https://api.speechweave.com/v1",
		);
		this.fetch_func = options.fetch_func || fetch;
		if ( ! this.api_key ) {

			throw new Error( "SpeechWeave API key is required (api_key, or SPEECHWEAVE_API_KEY)" );
		
		}
	
	}

	/**
	 * Authenticated fetch against base_url.
	 * Adds Bearer and User-Agent when missing. Path is relative (leading `/` optional).
	 */
	async rawFetch(
		path : string,
		init : RequestInit = {},
	) : Promise<Response> {

		const formatted_path = path.startsWith( "/" ) ? path : `/${ path }`;
		const url = `${ this.base_url }${ formatted_path }`;
		const h = new Headers( init.headers );
		if ( ! h.has( "Authorization" ) ) {

			h.set( "Authorization", `Bearer ${ this.api_key }` );
		
		}
		if ( ! h.has( "User-Agent" ) ) {

			h.set( "User-Agent", `speechweave-node/${ VERSION }` );
		
		}

		return this.fetch_func( url, { ...init,
			headers: h } );
	
	}

	protected async requestJson<T>(
		method : string,
		path : string,
		json ?: unknown,
		params ?: Record<string, string | number | boolean | undefined | null>,
	) : Promise<T> {

		let request_path = path;
		if ( params ) {

			const search = new URLSearchParams();
			for ( const [
				key,
				value, 
			] of Object.entries( params ) ) {

				if ( value === undefined || value === null ) {

					continue;
				
				}
				search.set( key, String( value ) );
			
			}
			const qs = search.toString();
			if ( qs ) {

				request_path = `${ path }${ path.includes( "?" ) ? "&" : "?" }${ qs }`;
			
			}
		
		}

		const headers : HeadersInit = { Accept: "application/json" };
		let body : string | undefined;
		if ( json !== undefined ) {

			( headers as Record<string, string> )[ "Content-Type" ] = "application/json";
			body = JSON.stringify( json );
		
		}

		const response = await this.rawFetch( request_path, { method,
			headers,
			body } );
		if ( ! response.ok ) {

			const ct = response.headers.get( "content-type" ) || "";
			let err_body : unknown;
			let message : string;
			let code : string | undefined = String( response.status );
			let retry_after : number | undefined;
			const header_retry = response.headers.get( "Retry-After" );
			if ( header_retry ) {

				const n = parseInt( header_retry, 10 );
				if ( Number.isFinite( n ) ) {

					retry_after = n;
				
				}
			
			}
			try {

				if ( ct.includes( "application/json" ) ) {

					err_body = await response.json();
					const j = err_body as {
						error ?: string;
						message ?: string;
						code ?: string;
						retry_after ?: number;
					};
					message = String( j?.error || j?.message || response.statusText );
					if ( j?.code ) {

						code = j.code;
					
					}
					if ( typeof j?.retry_after === "number" ) {

						retry_after = j.retry_after;
					
					}
				
				}
				else {

					const t = await response.text();
					message = t.slice( 0, 500 ) || response.statusText;
				
				}
			
			}
			catch {

				message = response.statusText;
			
			}

			throw new SpeechWeaveError(
				message,
				response.status,
				code,
				err_body,
				retry_after,
			);
		
		}

		return ( await response.json() ) as T;
	
	}

	/**
	 * Request a short-lived PUT URL and object_key for direct upload to storage.
	 *
	 * @param params.filename - Original name (used in the storage key).
	 * @param params.content_type - MIME type that must match the subsequent PUT.
	 */
	async presignUpload(
		params : {
			filename : string;
			content_type : string;
		},
	) : Promise<PresignResponse> {

		return this.requestJson<PresignResponse>(
			"POST",
			"/uploads",
			{
				filename: params.filename,
				content_type: params.content_type,
			},
		);
	
	}

	/**
	 * PUT audio bytes to a presigned upload_url.
	 * Sets Content-Length when the body can be measured; pass file_size for pipes/live streams.
	 *
	 * @param uploadUrl - upload_url from presignUpload.
	 */
	async putToPresignedUrl(
		uploadUrl : string,
		body : Buffer | ReadStream | Blob,
		contentType : string,
		options : { file_size ?: number } = {},
	) : Promise<void> {

		const headers = new Headers( { "Content-Type": contentType } );
		const content_length = await getBodyLength( body, options.file_size );
		if ( content_length != null ) {

			headers.set( "Content-Length", String( content_length ) );
		
		}

		const init : RequestInit & { duplex ?: string } = {
			method: "PUT",
			headers,
			body: body as BodyInit,
		};
		const is_node_stream = body && typeof ( body as ReadStream ).pipe === "function";
		if ( is_node_stream ) {

			init.duplex = "half";
		
		}
		const response = await this.fetch_func( uploadUrl, init );
		if ( ! response.ok ) {

			const message = await readErrorMessage( response );
			throw new SpeechWeaveError(
				`R2 upload failed: ${ message }`,
				response.status,
				"UPLOAD_FAILED",
			);
		
		}
	
	}

	/**
	 * Presign → PUT → create job. Returns the create ack (no transcript); poll getJob or waitForJob.
	 * Omitting service_mode leaves the API default (deferred). Synchronous rejects files over the sync size cap (default 512 MiB).
	 *
	 * @param options.filename - Defaults to audio.bin.
	 * @param options.content_type - Defaults to application/octet-stream.
	 * @param options.language - Two-letter ISO code (e.g. 'en', 'es').
	 * @param options.file_size - Content-Length when the body cannot be measured (pipes, live streams).
	 */
	async transcribeFile(
		file : ReadStream | Buffer | Blob,
		options : {
			filename ?: string;
			content_type ?: string;
			model ?: string;
			service_mode ?: ServiceMode;
			language ?: string;
			metadata ?: Record<string, unknown>;
			file_size ?: number;
		} = {},
	) : Promise<CreateJobResponse> {

		const filename = options.filename || "audio.bin";
		const content_type = options.content_type || "application/octet-stream";
		const presign = await this.presignUpload( {
			filename,
			content_type,
		} );
		const put_opts = { file_size: options.file_size };

		if ( Buffer.isBuffer( file ) || file instanceof Blob ) {

			await this.putToPresignedUrl( presign.upload_url, file, content_type, put_opts );
		
		}
		else {

			await this.putToPresignedUrl(
				presign.upload_url,
				file as ReadStream,
				content_type,
				put_opts,
			);
		
		}

		return this.createJob( {
			object_key: presign.object_key,
			model: options.model,
			service_mode: options.service_mode,
			language: options.language,
			metadata: options.metadata,
		} );
	
	}

	/**
	 * Same as {@link transcribeFile}, then poll until completed, failed, or cancelled.
	 *
	 * @param options.wait_timeout_ms - Defaults to SPEECHWEAVE_JOB_WAIT_MS or 300_000.
	 * @param options.poll_ms - Poll interval; defaults to 1500.
	 */
	async transcribeFileBlocking(
		file : ReadStream | Buffer | Blob,
		options : {
			filename ?: string;
			content_type ?: string;
			model ?: string;
			service_mode ?: ServiceMode;
			language ?: string;
			metadata ?: Record<string, unknown>;
			file_size ?: number;
			wait_timeout_ms ?: number;
			poll_ms ?: number;
		} = {},
	) : Promise<V1Job> {

		const created = await this.transcribeFile( file, options );

		return waitForJob(
			this,
			created.id,
			{
				timeout_ms: options.wait_timeout_ms ?? Number( process.env?.SPEECHWEAVE_JOB_WAIT_MS || 300_000 ),
				poll_ms: options.poll_ms ?? 1_500,
			},
		);
	
	}

	/**
	 * Create a transcription job from an already-uploaded object or a remote URL.
	 * Provide exactly one of object_key, input_url, or audio_url. type defaults to transcription.
	 * Omitting service_mode leaves the API default (deferred).
	 *
	 * @param params.object_key - From PresignResponse after a successful PUT.
	 * @param params.input_url - Publicly reachable audio URL.
	 * @param params.audio_url - Alias for input_url.
	 * @param params.language - Two-letter ISO code (e.g. 'en', 'es').
	 */
	async createJob(
		params : {
			object_key ?: string;
			input_url ?: string;
			audio_url ?: string;
			model ?: string;
			service_mode ?: ServiceMode;
			language ?: string;
			type ?: string;
			metadata ?: Record<string, unknown>;
		},
	) : Promise<CreateJobResponse> {

		const payload : Record<string, unknown> = {
			type: params.type || "transcription",
		};
		if ( params.object_key != null ) {

			payload.object_key = params.object_key;
		
		}
		if ( params.input_url != null ) {

			payload.input_url = params.input_url;
		
		}
		if ( params.audio_url != null ) {

			payload.audio_url = params.audio_url;
		
		}
		if ( params.model != null ) {

			payload.model = params.model;
		
		}
		if ( params.service_mode != null ) {

			payload.service_mode = params.service_mode;
		
		}
		if ( params.language != null ) {

			payload.language = params.language;
		
		}
		if ( params.metadata != null ) {

			payload.metadata = params.metadata;
		
		}

		return this.requestJson<CreateJobResponse>( "POST", "/jobs", payload );
	
	}

	/**
	 * Fetch the current job record (status, transcript when completed, error when failed).
	 *
	 * @param job_id - Id from createJob / transcribeFile.
	 */
	async getJob(
		job_id : string,
	) : Promise<V1Job> {

		return this.requestJson<V1Job>(
			"GET",
			`/jobs/${ encodeURIComponent( job_id ) }`,
		);
	
	}

	/**
	 * List jobs for the authenticated account.
	 *
	 * @param params.status - Filter by PublicJobStatus value.
	 * @param params.page - 1-based page; API default if omitted.
	 * @param params.limit - Page size; API default if omitted.
	 */
	async listJobs(
		params : {
			page ?: number;
			limit ?: number;
			status ?: string;
		} = {},
	) : Promise<ListJobsResponse> {

		return this.requestJson<ListJobsResponse>(
			"GET",
			"/jobs",
			undefined,
			{
				page: params.page,
				limit: params.limit,
				status: params.status,
			},
		);
	
	}

	/**
	 * Cancel a pending or processing job.
	 * Fails if the job is already completed, failed, or cancelled.
	 *
	 * @param job_id - Id from createJob / transcribeFile.
	 */
	async cancelJob(
		job_id : string,
	) : Promise<CancelJobResponse> {

		return this.requestJson(
			"POST",
			`/jobs/${ encodeURIComponent( job_id ) }/cancel`,
			{},
		);
	
	}

	/**
	 * Open a disk path and run {@link transcribeFile}.
	 * filename is taken from the path basename.
	 *
	 * @param file_path - Absolute or relative path on the local filesystem.
	 */
	async transcribeFilePath(
		file_path : string,
		options : {
			model ?: string;
			service_mode ?: ServiceMode;
			language ?: string;
			content_type ?: string;
			metadata ?: Record<string, unknown>;
			file_size ?: number;
		} = {},
	) : Promise<CreateJobResponse> {

		const stream = createReadStream( file_path );
		const base = file_path.split( /[/\\]/ ).pop() || "audio.bin";

		return this.transcribeFile(
			stream,
			{
				filename: base,
				content_type: options.content_type,
				model: options.model,
				service_mode: options.service_mode,
				language: options.language,
				metadata: options.metadata,
				file_size: options.file_size,
			},
		);
	
	}

}
