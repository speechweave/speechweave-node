# Changelog

## [1.2.0]

### Changed
- **OpenAI-style error envelope:** the server now nests wallet/billing `402` errors (`PLATFORM_SPEND_CAP_REACHED`, `USER_SPEND_CAP_REACHED`, `INSUFFICIENT_BALANCE`, `CHECKOUT_REQUIRED`, `CHECKOUT_UNAVAILABLE`, `WALLET_EMPTY`) as `{"error": {"message", "type", "param", "code"}}`, matching the OpenAI SDK's own error-body convention. `SpeechWeaveError` gained `type` and `param`, populated from the new envelope. This SDK version parses both the new nested shape and the previous flat-string shape, so it's safe to upgrade independent of which server version you're calling.

## [1.1.0]

### Added
- **MIME Inference Helper:** Exported `inferContentType(filename?, fallback?)` from the package root to automatically map audio and video extensions to their proper MIME types, safely defaulting to `application/octet-stream` without throwing.

### Changed
- **Automatic Content-Type Resolution:** `transcribeFile` and all compatibility helpers now infer `content_type` from filenames when omitted. Explicit `content_type` strings and browser `Blob.type` values retain strict priority over filename inference.