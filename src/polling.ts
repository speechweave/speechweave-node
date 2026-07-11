import type { SpeechWeaveClient } from "./client.js";
import type { V1Job } from "./types.js";
import { SpeechWeaveError } from "./errors.js";

const TERMINAL = new Set( [
	"completed",
	"failed",
	"cancelled",
] );

export interface WaitForJobOptions {
	/** Max wait in ms; defaults to 3_600_000. */
	timeout_ms ?: number;
	/** Interval between getJob polls; defaults to 2000. */
	poll_ms ?: number;
}

/**
 * Poll getJob until completed, failed, or cancelled.
 * Throws SpeechWeaveError with code JOB_WAIT_TIMEOUT on deadline.
 *
 * @param job_id - Id from createJob / transcribeFile.
 */
export async function waitForJob(
	client : SpeechWeaveClient,
	job_id : string,
	opts : WaitForJobOptions = {},
) : Promise< V1Job > {

	const timeout_ms = opts.timeout_ms ?? 3_600_000;
	const poll_ms = opts.poll_ms ?? 2_000;
	const deadline = ( Date.now() + timeout_ms );

	while ( Date.now() < deadline ) {

		const job = await client.getJob( job_id );
		if ( TERMINAL.has( String( job.status ) ) ) {

			return job;
		
		}

		await new Promise( ( r ) => setTimeout( r, poll_ms ) );
	
	}

	throw new SpeechWeaveError(
		"Timed out waiting for job",
		504,
		"JOB_WAIT_TIMEOUT",
		{ job_id },
	);

}
