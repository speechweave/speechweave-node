import { describe, expect, it, vi } from "vitest";
import { SpeechWeave } from "../src/index.js";
import { SpeechWeaveError } from "../src/errors.js";
import { waitForJob } from "../src/polling.js";

function jsonResponse(
	status : number,
	body : unknown,
	headers : Record<string, string> = {},
) : Response {

	return new Response( JSON.stringify( body ), {
		status,
		headers: {
			"content-type": "application/json",
			...headers,
		},
	} );

}

describe( "SpeechWeave client", () => {

	it( "sends Authorization", async () => {

		const fetch_func = vi.fn( async () =>
			jsonResponse( 200, { id: "job_1",
				status: "completed" } ),
		);
		const client = new SpeechWeave( {
			api_key: "sk_test",
			fetch_func,
		} );

		await client.getJob( "job_1" );

		expect( fetch_func ).toHaveBeenCalledTimes( 1 );
		const call = fetch_func.mock.calls[ 0 ] as unknown as [string, RequestInit];
		expect( String( call[ 0 ] ) ).toContain( "/jobs/job_1" );
		const headers = new Headers( call[ 1 ].headers );
		expect( headers.get( "Authorization" ) ).toBe( "Bearer sk_test" );
	
	} );

	it( "maps error payloads to SpeechWeaveError", async () => {

		const fetch_func = vi.fn( async () =>
			jsonResponse( 401, { error: "Unauthorized",
				code: "UNAUTHORIZED" } ),
		);
		const client = new SpeechWeave( {
			api_key: "bad_key",
			fetch_func,
		} );

		await expect( client.getJob( "any_id" ) ).rejects.toMatchObject( {
			name: "SpeechWeaveError",
			status: 401,
			code: "UNAUTHORIZED",
			message: "Unauthorized",
		} );
	
	} );

	it( "maps 402 payment required to SpeechWeaveError", async () => {

		const fetch_func = vi.fn( async () =>
			jsonResponse( 402, {
				error: "Insufficient wallet balance",
				message: "Insufficient wallet balance",
				code: "INSUFFICIENT_BALANCE",
				balanceCents: 0,
				requiredCents: 100,
			} ),
		);
		const client = new SpeechWeave( {
			api_key: "sk_test",
			fetch_func,
		} );

		await expect( client.getJob( "any_id" ) ).rejects.toMatchObject( {
			name: "SpeechWeaveError",
			status: 402,
			code: "INSUFFICIENT_BALANCE",
			message: "Insufficient wallet balance",
		} );
	
	} );

	it( "listJobs passes query params", async () => {

		const expected = { data: [
			{ id: "job_1" }, 
		],
		pagination: { page: 2 } };
		const fetch_func = vi.fn( async () => jsonResponse( 200, expected ) );
		const client = new SpeechWeave( {
			api_key: "sk_test",
			fetch_func,
		} );

		const result = await client.jobs.list( { page: 2,
			limit: 10,
			status: "completed" } );

		expect( result ).toEqual( expected );
		const call = fetch_func.mock.calls[ 0 ] as unknown as [string, RequestInit];
		const url = String( call[ 0 ] );
		expect( url ).toContain( "/jobs?" );
		expect( url ).toContain( "page=2" );
		expect( url ).toContain( "limit=10" );
		expect( url ).toContain( "status=completed" );
	
	} );

	it( "waitForJob returns terminal job", async () => {

		const client = {
			getJob: vi.fn()
				.mockResolvedValueOnce( { id: "job_1",
					status: "queued" } )
				.mockResolvedValueOnce( { id: "job_1",
					status: "completed",
					transcript: "done" } ),
		};

		const result = await waitForJob(
			client as never,
			"job_1",
			{ poll_ms: 1,
				timeout_ms: 5_000 },
		);

		expect( result.status ).toBe( "completed" );
		expect( result.transcript ).toBe( "done" );
	
	} );

	it( "waitForJob times out", async () => {

		const client = {
			getJob: vi.fn( async () => ( { id: "job_1",
				status: "queued" } ) ),
		};

		await expect(
			waitForJob( client as never, "job_1", { poll_ms: 1,
				timeout_ms: 20 } ),
		).rejects.toBeInstanceOf( SpeechWeaveError );
	
	} );

	it( "exposes compat namespaces", () => {

		const client = new SpeechWeave( {
			api_key: "sk_test",
			fetch_func: vi.fn(),
		} );
		expect( client.audio.transcriptions ).toBeDefined();
		expect( client.listen.prerecorded ).toBeDefined();
		expect( client.transcripts.transcribe ).toBeDefined();
		expect( client.jobs.create ).toBeDefined();
		expect( client.jobs.list ).toBeDefined();
	
	} );

	it( "sends User-Agent on API requests", async () => {

		const { VERSION } = await import( "../src/version.js" );
		const fetch_func = vi.fn( async () =>
			jsonResponse( 200, { id: "job_1",
				status: "completed" } ),
		);
		const client = new SpeechWeave( {
			api_key: "sk_test",
			fetch_func,
		} );

		await client.getJob( "job_1" );

		const call = fetch_func.mock.calls[ 0 ] as unknown as [string, RequestInit];
		const headers = new Headers( call[ 1 ].headers );
		expect( headers.get( "User-Agent" ) ).toBe( `speechweave-node/${ VERSION }` );
	
	} );

	it( "putToPresignedUrl streams with duplex and file_size Content-Length", async () => {

		const { Readable } = await import( "node:stream" );
		const stream = Readable.from( [
			Buffer.from( "chunk" ), 
		] );
		const fetch_func = vi.fn( async () => new Response( null, { status: 200 } ) );
		const client = new SpeechWeave( {
			api_key: "sk_test",
			fetch_func,
		} );

		await client.putToPresignedUrl(
			"https://upload.example/presigned",
			stream as never,
			"audio/wav",
			{ file_size: 5 },
		);

		expect( fetch_func ).toHaveBeenCalledTimes( 1 );
		const call = fetch_func.mock.calls[ 0 ] as unknown as [string, RequestInit & { duplex ?: string }];
		expect( call[ 0 ] ).toBe( "https://upload.example/presigned" );
		expect( call[ 1 ].duplex ).toBe( "half" );
		expect( call[ 1 ].body ).toBe( stream );
		expect( Buffer.isBuffer( call[ 1 ].body ) ).toBe( false );
		const headers = new Headers( call[ 1 ].headers );
		expect( headers.get( "Content-Length" ) ).toBe( "5" );
		expect( headers.get( "Content-Type" ) ).toBe( "audio/wav" );
	
	} );

} );
