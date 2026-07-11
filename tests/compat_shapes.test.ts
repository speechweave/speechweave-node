import { describe, expect, it, vi } from "vitest";
import {
	createJobFromUrl,
	shapeAssemblyResponse,
	shapeDeepgramResponse,
	shapeOpenAiResponse,
	uploadAndCreateJob,
} from "../src/compat_shapes.js";
import type { SpeechWeaveClient } from "../src/client.js";

describe( "compat shapes", () => {

	it( "shapes a minimal OpenAI response", () => {

		expect(
			shapeOpenAiResponse( {
				id: "job_123",
				status: "completed",
				transcript: "hello world",
			} ),
		).toEqual( {
			text: "hello world",
			task: "transcribe",
		} );
	
	} );

	it( "shapes OpenAI response with metadata", () => {

		expect(
			shapeOpenAiResponse( {
				id: "job_123",
				status: "completed",
				transcript: "hello world",
				duration: 12.5,
				language: "en",
			} ),
		).toEqual( {
			text: "hello world",
			task: "transcribe",
			duration: 12.5,
			language: "en",
		} );
	
	} );

	it( "shapes a Deepgram response", () => {

		const result = shapeDeepgramResponse(
			{
				id: "job_456",
				status: "completed",
				transcript: "deepgram text",
				language: "en",
			},
			{ model: "core" },
		);
		expect( result.metadata ).toMatchObject( {
			request_id: "job_456",
			model_info: { name: "core" },
		} );
		const channels = ( result.results as { channels : Array<{ alternatives : Array<{ transcript : string;
			language ?: string; }>; }>; } ).channels;
		expect( channels[ 0 ].alternatives[ 0 ].transcript ).toBe( "deepgram text" );
		expect( channels[ 0 ].alternatives[ 0 ].language ).toBe( "en" );
	
	} );

	it( "shapes a completed Assembly response", () => {

		expect(
			shapeAssemblyResponse( {
				id: "job_789",
				status: "completed",
				transcript: "assembly text",
				duration: 30,
				language: "en",
				error: null,
			} ),
		).toEqual( {
			id: "job_789",
			status: "completed",
			text: "assembly text",
			audio_duration: 30,
			language: "en",
			error: null,
		} );
	
	} );

	it( "shapes a failed Assembly response", () => {

		const result = shapeAssemblyResponse( {
			id: "job_999",
			status: "failed",
			transcript: "",
			error: "decode failed",
		} );
		expect( result.status ).toBe( "failed" );
		expect( result.error ).toBe( "decode failed" );
	
	} );

	it( "uploadAndCreateJob passes service_mode", async () => {

		const client = {
			presignUpload: vi.fn( async () => ( {
				upload_url: "https://example.com/upload",
				object_key: "obj_123",
			} ) ),
			putToPresignedUrl: vi.fn( async () => undefined ),
			createJob: vi.fn( async () => ( { id: "job_1",
				status: "queued" } ) ),
		} as unknown as SpeechWeaveClient;

		await uploadAndCreateJob( client, {
			data: Buffer.from( "audio" ),
			filename: "test.wav",
			service_mode: "deferred",
		} );

		expect( client.createJob ).toHaveBeenCalledWith( {
			object_key: "obj_123",
			service_mode: "deferred",
			model: undefined,
			language: undefined,
			metadata: undefined,
		} );
	
	} );

	it( "uploadAndCreateJob passes ReadStream through without buffering", async () => {

		const { Readable } = await import( "node:stream" );
		const stream = Readable.from( [
			Buffer.from( "audio" ), 
		] );
		const client = {
			presignUpload: vi.fn( async () => ( {
				upload_url: "https://example.com/upload",
				object_key: "obj_stream",
			} ) ),
			putToPresignedUrl: vi.fn( async () => undefined ),
			createJob: vi.fn( async () => ( { id: "job_stream",
				status: "queued" } ) ),
		} as unknown as SpeechWeaveClient;

		await uploadAndCreateJob( client, {
			data: stream as never,
			filename: "stream.wav",
			file_size: 5,
		} );

		expect( client.putToPresignedUrl ).toHaveBeenCalledTimes( 1 );
		const put_args = ( client.putToPresignedUrl as ReturnType<typeof vi.fn> ).mock.calls[ 0 ];
		expect( put_args[ 1 ] ).toBe( stream );
		expect( Buffer.isBuffer( put_args[ 1 ] ) ).toBe( false );
		expect( put_args[ 3 ] ).toEqual( { file_size: 5 } );
	
	} );

	it( "createJobFromUrl passes service_mode", async () => {

		const client = {
			createJob: vi.fn( async () => ( { id: "job_2",
				status: "queued" } ) ),
		} as unknown as SpeechWeaveClient;

		await createJobFromUrl( client, {
			url: "https://example.com/audio.wav",
			service_mode: "deferred",
		} );

		expect( client.createJob ).toHaveBeenCalledWith( {
			input_url: "https://example.com/audio.wav",
			service_mode: "deferred",
			model: undefined,
			language: undefined,
			metadata: undefined,
		} );
	
	} );

} );
