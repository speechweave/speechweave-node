export class SpeechWeaveError extends Error {

	readonly status : number;
	readonly code ?: string;
	readonly body ?: unknown;
	readonly retry_after ?: number;

	constructor(
		message : string,
		status = 500,
		code ?: string,
		body ?: unknown,
		retry_after ?: number,
	) {

		super( message );

		this.name = "SpeechWeaveError";
		this.status = status;
		this.code = code;
		this.body = body;
		this.retry_after = retry_after;
	
	}

}
