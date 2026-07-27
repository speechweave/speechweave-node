import { describe, expect, it } from "vitest";
import { inferContentType } from "../src/mime.js";

describe( "inferContentType", () => {

	it( "maps known extensions", () => {

		expect( inferContentType( "recording.mp3" ) ).toBe( "audio/mpeg" );
		expect( inferContentType( "recording.WAV" ) ).toBe( "audio/wav" );
		expect( inferContentType( "recording.flac" ) ).toBe( "audio/flac" );
		expect( inferContentType( "recording.m4a" ) ).toBe( "audio/mp4" );
		expect( inferContentType( "recording.mov" ) ).toBe( "video/quicktime" );
		expect( inferContentType( "recording.m4v" ) ).toBe( "video/x-m4v" );
		expect( inferContentType( "recording.webm" ) ).toBe( "audio/webm" );
		expect( inferContentType( "recording.ogg" ) ).toBe( "audio/ogg" );
		expect( inferContentType( "recording.opus" ) ).toBe( "audio/opus" );
		expect( inferContentType( "recording.aac" ) ).toBe( "audio/aac" );

	} );

	it( "falls back to octet-stream for unknown or missing extensions", () => {

		expect( inferContentType( "recording.xyz" ) ).toBe( "application/octet-stream" );
		expect( inferContentType( "recording" ) ).toBe( "application/octet-stream" );
		expect( inferContentType( undefined ) ).toBe( "application/octet-stream" );
		expect( inferContentType( "" ) ).toBe( "application/octet-stream" );

	} );

	it( "never throws on unusual input", () => {

		expect( () => inferContentType( "." ) ).not.toThrow();
		expect( () => inferContentType( "no-dot-at-all" ) ).not.toThrow();

	} );

} );
