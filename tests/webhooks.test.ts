import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhook } from "../src/webhooks.js";

function sign(
	secret : string,
	timestamp : string,
	body : string,
) : string {

	return crypto
		.createHmac( "sha256", secret )
		.update( `${ timestamp }.${ body }` )
		.digest( "hex" );

}

describe( "verifyWebhook", () => {

	it( "accepts a valid signature", () => {

		const secret = "whsec_test";
		const body = '{"type":"job.completed","id":"job_1"}';
		const t = String( Math.floor( Date.now() / 1000 ) );
		const sig = sign( secret, t, body );

		expect( verifyWebhook( secret, body, `t=${ t },v1=${ sig }` ) ).toEqual( { ok: true } );
	
	} );

	it( "accepts previous secret during rotation", () => {

		const active = "whsec_new";
		const previous = "whsec_old";
		const body = '{"type":"job.failed"}';
		const t = String( Math.floor( Date.now() / 1000 ) );
		const sig = sign( previous, t, body );

		expect(
			verifyWebhook( [
				active,
				previous, 
			], body, `t=${ t },v1=${ sig }` ),
		).toEqual( { ok: true } );
	
	} );

	it( "rejects timestamp skew", () => {

		const secret = "whsec_test";
		const body = "{}";
		const t = String( Math.floor( Date.now() / 1000 ) - 400 );
		const sig = sign( secret, t, body );

		expect( verifyWebhook( secret, body, `t=${ t },v1=${ sig }` ) ).toEqual( {
			ok: false,
			reason: "timestamp_skew",
		} );
	
	} );

	it( "rejects a bad signature", () => {

		const secret = "whsec_test";
		const body = "{}";
		const t = String( Math.floor( Date.now() / 1000 ) );

		expect(
			verifyWebhook( secret, body, `t=${ t },v1=${ "0".repeat( 64 ) }` ),
		).toEqual( {
			ok: false,
			reason: "bad_signature",
		} );
	
	} );

	it( "rejects a mangled header", () => {

		expect( verifyWebhook( "whsec_test", "{}", "not-a-valid-header" ) ).toEqual( {
			ok: false,
			reason: "missing_t_or_v1",
		} );
	
	} );

	it( "rejects missing v1", () => {

		expect( verifyWebhook( "whsec_test", "{}", "t=12345" ) ).toEqual( {
			ok: false,
			reason: "missing_t_or_v1",
		} );
	
	} );

	it( "rejects empty secrets", () => {

		expect( verifyWebhook( "", "{}", "t=1,v1=abc" ) ).toEqual( {
			ok: false,
			reason: "no_secrets",
		} );
		expect( verifyWebhook( [
			"",
			"  ", 
		], "{}", "t=1,v1=abc" ) ).toEqual( {
			ok: false,
			reason: "no_secrets",
		} );
	
	} );

	it( "rejects a bad timestamp", () => {

		expect( verifyWebhook( "whsec_test", "{}", "t=not-a-number,v1=abc" ) ).toEqual( {
			ok: false,
			reason: "bad_timestamp",
		} );
	
	} );

} );
