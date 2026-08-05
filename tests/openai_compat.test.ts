import { describe, expect, it, vi } from "vitest";
import { createOpenAiAudioNamespace } from "../src/openai/openai_compat.js";
import type { SpeechWeaveClient } from "../src/client.js";

function makeClient( overrides : Record<string, unknown> = {} ) {

	return {
		presignUpload: vi.fn( async () => ( {
			upload_url: "https://example.com/upload",
			object_key: "obj_1",
		} ) ),
		putToPresignedUrl: vi.fn( async () => undefined ),
		ensureWithinLimits: vi.fn( async () => undefined ),
		createJob: vi.fn( async () => ( { id: "job_1",
			status: "queued" } ) ),
		getJob: vi.fn( async () => ( {
			id: "job_1",
			status: "completed",
			transcript: "hello world",
			duration: 1.5,
			language: "en",
		} ) ),
		getJobFormatted: vi.fn(),
		...overrides,
	} as unknown as SpeechWeaveClient;

}

describe( "openai compat namespace", () => {

	it( "transcriptions.create defaults to the extended json shape", async () => {

		const client = makeClient();
		const audio = createOpenAiAudioNamespace( client );

		const result = await audio.transcriptions.create( {
			file: Buffer.from( "audio" ),
			filename: "test.wav",
		} );

		expect( result ).toEqual( {
			text: "hello world",
			task: "transcribe",
			duration: 1.5,
			language: "en",
		} );
		expect( client.createJob ).toHaveBeenCalledWith(
			expect.objectContaining( { task: undefined, language: undefined } ),
		);

	} );

	it( "transcriptions.create forwards prompt/temperature/timestamp_granularities to job creation", async () => {

		const client = makeClient();
		const audio = createOpenAiAudioNamespace( client );

		await audio.transcriptions.create( {
			file: Buffer.from( "audio" ),
			filename: "test.wav",
			language: "es",
			prompt: "SpeechWeave, DeepInfra",
			temperature: 0.2,
			timestamp_granularities: [ "word" ],
		} );

		expect( client.createJob ).toHaveBeenCalledWith(
			expect.objectContaining( {
				language: "es",
				prompt: "SpeechWeave, DeepInfra",
				temperature: 0.2,
				timestamp_granularities: [ "word" ],
			} ),
		);

	} );

	it( "transcriptions.create with response_format 'vtt' delegates to getJobFormatted and returns its raw string", async () => {

		const client = makeClient( {
			getJobFormatted: vi.fn( async () => "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nhello\n" ),
		} );
		const audio = createOpenAiAudioNamespace( client );

		const result = await audio.transcriptions.create( {
			file: Buffer.from( "audio" ),
			filename: "test.wav",
			response_format: "vtt",
		} );

		expect( result ).toBe( "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nhello\n" );
		expect( client.getJobFormatted ).toHaveBeenCalledWith( "job_1", "vtt" );

	} );

	it( "transcriptions.create with response_format 'verbose_json' delegates to getJobFormatted and returns its object", async () => {

		const verbose = {
			task: "transcribe",
			text: "hello world",
			language: "en",
			duration: 1.5,
			segments: [ { start: 0, end: 1.5, text: "hello world" } ],
		};
		const client = makeClient( { getJobFormatted: vi.fn( async () => verbose ) } );
		const audio = createOpenAiAudioNamespace( client );

		const result = await audio.transcriptions.create( {
			file: Buffer.from( "audio" ),
			filename: "test.wav",
			response_format: "verbose_json",
		} );

		expect( result ).toEqual( verbose );

	} );

	it( "response_format 'json' takes the default shape path, not getJobFormatted", async () => {

		const client = makeClient();
		const audio = createOpenAiAudioNamespace( client );

		await audio.transcriptions.create( {
			file: Buffer.from( "audio" ),
			filename: "test.wav",
			response_format: "json",
		} );

		expect( client.getJobFormatted ).not.toHaveBeenCalled();

	} );

	it( "wait: false returns the unfinished job without polling or formatting", async () => {

		const client = makeClient();
		const audio = createOpenAiAudioNamespace( client );

		const result = await audio.transcriptions.create( {
			file: Buffer.from( "audio" ),
			filename: "test.wav",
			response_format: "vtt",
			wait: false,
		} );

		expect( result ).toEqual( { id: "job_1", status: "queued" } );
		expect( client.getJobFormatted ).not.toHaveBeenCalled();

	} );

	it( "translations.create forces task=translate, omits language, and shapes task as translate", async () => {

		const client = makeClient();
		const audio = createOpenAiAudioNamespace( client );

		const result = await audio.translations.create( {
			file: Buffer.from( "audio" ),
			filename: "test.wav",
		} );

		expect( client.createJob ).toHaveBeenCalledWith(
			expect.objectContaining( { task: "translate", language: undefined } ),
		);
		expect( result ).toEqual( {
			text: "hello world",
			task: "translate",
			duration: 1.5,
			language: "en",
		} );

	} );

	it( "translations.create with response_format 'srt' delegates to getJobFormatted", async () => {

		const client = makeClient( { getJobFormatted: vi.fn( async () => "1\n00:00:00,000 --> 00:00:01,000\nhello\n" ) } );
		const audio = createOpenAiAudioNamespace( client );

		const result = await audio.translations.create( {
			file: Buffer.from( "audio" ),
			filename: "test.wav",
			response_format: "srt",
		} );

		expect( result ).toBe( "1\n00:00:00,000 --> 00:00:01,000\nhello\n" );
		expect( client.getJobFormatted ).toHaveBeenCalledWith( "job_1", "srt" );

	} );

} );
