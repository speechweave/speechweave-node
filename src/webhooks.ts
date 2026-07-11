import crypto from "node:crypto";

export interface VerifyWebhookResult {
	ok : boolean;
	reason ?: string;
}

function timingSafeEqual(
	a : string,
	b : string,
) : boolean {

	const ab = Buffer.from( a, "utf8" );
	const bb = Buffer.from( b, "utf8" );
	if ( ab.length !== bb.length ) {

		return false;
	
	}

	return crypto.timingSafeEqual( ab, bb );

}

/**
 * Verify `SpeechWeave-Signature` header (Stripe-style: `t=unix,v1=hex` — may include multiple `v1=` during secret rotation).
 *
 * @param secret — active webhook signing secret, or array of `[active, previous]` during a rotation window
 * @param raw_body — exact request body string (use raw bytes as UTF-8 string)
 * @param signature_header — value of the `SpeechWeave-Signature` header
 * @param tolerance_seconds — max clock skew; defaults to 300
 */
export function verifyWebhook(
	secret : string | string[],
	raw_body : string,
	signature_header : string,
	tolerance_seconds = 300,
) : VerifyWebhookResult {

	const secrets = ( Array.isArray( secret ) ? secret : [
		secret, 
	] )
		.map( s => String( s || "" ).trim() )
		.filter( Boolean );
	if ( ! secrets.length ) {

		return {
			ok: false,
			reason: "no_secrets",
		};
	
	}

	const header = String( signature_header || "" ).trim();
	const parts = header.split( "," ).map( p => p.trim() );
	let t : string | null = null;
	const v1_list : string[] = [
	];
	for ( const part of parts ) {

		if ( part.startsWith( "t=" ) ) {

			t = part.slice( 2 );
		
		}

		if ( part.startsWith( "v1=" ) ) {

			v1_list.push( part.slice( 3 ) );
		
		}
	
	}
	if (
		! t
		|| ! v1_list.length
	) {

		return {
			ok: false,
			reason: "missing_t_or_v1",
		};
	
	}
	const ts = Number( t );
	if ( ! Number.isFinite( ts ) ) {

		return {
			ok: false,
			reason: "bad_timestamp",
		};
	
	}
	const now = Math.floor( Date.now() / 1000 );
	if ( Math.abs( now - ts ) > tolerance_seconds ) {

		return {
			ok: false,
			reason: "timestamp_skew",
		};
	
	}

	for ( const secret of secrets ) {

		const expected = crypto.createHmac( "sha256", secret ).update( `${ t }.${ raw_body }` ).digest( "hex" );
		for ( const v1 of v1_list ) {

			if ( timingSafeEqual( expected, v1 ) ) {

				return {
					ok: true,
				};
			
			}
		
		}
	
	}

	return {
		ok: false,
		reason: "bad_signature",
	};

}
