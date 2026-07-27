const EXTENSION_TO_MIME : Record<string, string> = {
	".mp3": "audio/mpeg",
	".wav": "audio/wav",
	".flac": "audio/flac",
	".m4a": "audio/mp4",
	".mp4": "video/mp4",
	".mov": "video/quicktime",
	".m4v": "video/x-m4v",
	".webm": "audio/webm",
	".ogg": "audio/ogg",
	".opus": "audio/opus",
	".aac": "audio/aac",
};

/**
 * Infer a MIME type from a filename's extension. Falls back to `application/octet-stream`
 * (never throws) so callers can use it unconditionally on optional filenames.
 */
export function inferContentType(
	filename ?: string,
	fallback = "application/octet-stream",
) : string {

	if ( ! filename ) {

		return fallback;

	}
	const last_dot = filename.lastIndexOf( "." );
	if ( last_dot === -1 ) {

		return fallback;

	}
	const ext = filename.slice( last_dot ).toLowerCase();

	return EXTENSION_TO_MIME[ ext ] || fallback;

}
