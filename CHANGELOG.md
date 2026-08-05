# Changelog

## [1.5.0]

### Added

- `content_length` **on presign:** `presignUpload` accepts an optional `content_length` (bytes), and `transcribeFile`/`uploadAndCreateJob` pass it automatically when the body size is known locally.

### Removed

- `progress`**/**`stage` **removed from** `V1Job`**:** the API no longer returns these fields on job responses. Poll `status` instead (`queued` → `processing` → `completed`/`failed`/`cancelled`).

## [1.4.1]

### Changed

- **Dependency maintenance:** Ran `npm audit fix` to update transitive dev dependencies (`brace-expansion`, `nanoid`, `postcss`) to patched versions.



## [1.4.0]



### Added

- **Translation task:** Added `task: "translate"` to `transcribeFile`, `createJob`, and `uploadAndCreateJob` to translate audio to English text.
- **OpenAI-compat translations:** Added `client.audio.translations.create(...)` to mirror the OpenAI SDK's transcription translation flow.
- **Transcript formatting options:** Added support for `prompt`, `temperature`, and `timestamp_granularities` when creating jobs.
- **Formatted fetches:** Added `client.getJobFormatted(job_id, format)` to fetch a completed transcript as `text`, `srt`, `vtt`, or `verbose_json`. This also powers `response_format` resolution in the OpenAI-compat helper.
- **New types:** Exported `TranscriptionTask`, `TranscriptionResponseFormat`, `TimestampGranularity`, `TranscriptSegment`, `TranscriptWord`, and `VerboseTranscript`.



## [1.3.0]



### Added

- **Upload Limit Gate:** `transcribeFile` and `uploadAndCreateJob` now check the file size against the account's upload limits (`GET /v1/limits`, cached 5 minutes) before presigning, throwing a 413 `SpeechWeaveError` with code `FILE_TOO_LARGE` locally rather than spending a presign/upload on a file the API would reject. Also exports `getLimits`/`getCachedLimits` on `SpeechWeaveClient` and a new `AccountLimits` type. Falls back to letting the API decide when the limits lookup fails or the body size can't be measured (pipes, live streams).



## [1.2.0]



### Changed

- **OpenAI-style error envelope:** the server now nests wallet/billing `402` errors (`PLATFORM_SPEND_CAP_REACHED`, `USER_SPEND_CAP_REACHED`, `INSUFFICIENT_BALANCE`, `CHECKOUT_REQUIRED`, `CHECKOUT_UNAVAILABLE`, `WALLET_EMPTY`) as `{"error": {"message", "type", "param", "code"}}`, matching the OpenAI SDK's own error-body convention. `SpeechWeaveError` gained `type` and `param`, populated from the new envelope. This SDK version parses both the new nested shape and the previous flat-string shape, so it's safe to upgrade independent of which server version you're calling.



## [1.1.0]



### Added

- **MIME Inference Helper:** Exported `inferContentType(filename?, fallback?)` from the package root to automatically map audio and video extensions to their proper MIME types, safely defaulting to `application/octet-stream` without throwing.



### Changed

- **Automatic Content-Type Resolution:** `transcribeFile` and all compatibility helpers now infer `content_type` from filenames when omitted. Explicit `content_type` strings and browser `Blob.type` values retain strict priority over filename inference.

