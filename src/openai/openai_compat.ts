/**
 * OpenAI-shaped transcription/translation helpers.
 * For OpenAI migration, prefer the official `openai` package with `baseURL` set to SpeechWeave.
 */
import type { SpeechWeaveClient } from "../client.js";
import {
	finishCompatJob,
	shapeOpenAiResponse,
	uploadAndCreateJob,
	type UploadBody,
} from "../compat_shapes.js";
import type {
	TimestampGranularity,
	TranscriptionResponseFormat,
	V1Job,
	VerboseTranscript,
} from "../types.js";

export interface OpenAiTranscriptionCreateOptions {
	file : UploadBody;
	filename ?: string;
	model ?: string;
	language ?: string;
	/** Custom vocabulary/style hint (proper nouns, acronyms) for the first ~30s window. */
	prompt ?: string;
	/** Decoding temperature, clamped to [0, 1] server-side. */
	temperature ?: number;
	/** 'json' (default) and 'verbose_json' resolve to an object; 'text'/'srt'/'vtt' resolve to a string. */
	response_format ?: TranscriptionResponseFormat;
	/** Include 'word' for word-level timestamps (only meaningful with response_format 'verbose_json'). */
	timestamp_granularities ?: TimestampGranularity[];
	// Explicit Content-Length when the body cannot be measured.
	file_size ?: number;
	// When false, return the created job without polling (default true).
	wait ?: boolean;
}

export interface OpenAiTranslationCreateOptions {
	file : UploadBody;
	filename ?: string;
	model ?: string;
	prompt ?: string;
	temperature ?: number;
	response_format ?: TranscriptionResponseFormat;
	file_size ?: number;
	wait ?: boolean;
}

type OpenAiCompatResult =
	| { text : string; task : "transcribe" | "translate"; duration ?: number; language ?: string }
	| VerboseTranscript
	| string
	| V1Job
	| Record<string, unknown>;

async function runOpenAiCompatCreate(
	client : SpeechWeaveClient,
	task : "transcribe" | "translate",
	opts : {
		file : UploadBody;
		filename ?: string;
		model ?: string;
		language ?: string;
		prompt ?: string;
		temperature ?: number;
		response_format ?: TranscriptionResponseFormat;
		timestamp_granularities ?: TimestampGranularity[];
		file_size ?: number;
		wait ?: boolean;
	},
) : Promise<OpenAiCompatResult> {

	const name = opts.filename || "audio.bin";
	const job = await uploadAndCreateJob( client, {
		data: opts.file,
		filename: name,
		model: opts.model,
		language: task === "translate" ? undefined : opts.language,
		task: task === "translate" ? "translate" : undefined,
		prompt: opts.prompt,
		temperature: opts.temperature,
		timestamp_granularities: opts.timestamp_granularities,
		file_size: opts.file_size,
	} );
	const finished = await finishCompatJob( client, job, {
		wait: opts.wait ?? true,
		error_code: task === "translate" ? "OPENAI_TRANSLATE_PROXY" : "OPENAI_PROXY",
	} );
	if ( opts.wait === false ) {

		return finished;

	}

	const format = opts.response_format;
	if ( format && format !== "json" ) {

		const job_id = String( ( finished as { id ?: string } ).id || "" );

		return client.getJobFormatted( job_id, format );

	}

	return shapeOpenAiResponse( finished as Record<string, unknown>, { task } );

}

export function createOpenAiAudioNamespace(
	client : SpeechWeaveClient,
) {

	return {
		transcriptions: {
			/** OpenAI-shaped transcription create, drop-in compatibility wrapper. */
			create: async ( opts : OpenAiTranscriptionCreateOptions ) : Promise<OpenAiCompatResult> =>
				runOpenAiCompatCreate( client, "transcribe", opts ),
		},
		translations: {
			/**
			 * OpenAI-shaped translation create (audio in any supported language → English text).
			 * Note: unlike transcriptions, OpenAI's translations endpoint (and SpeechWeave's) has
			 * no `language` parameter, the source language is auto-detected and the target is
			 * always English.
			 */
			create: async ( opts : OpenAiTranslationCreateOptions ) : Promise<OpenAiCompatResult> =>
				runOpenAiCompatCreate( client, "translate", opts ),
		},
	};

}
