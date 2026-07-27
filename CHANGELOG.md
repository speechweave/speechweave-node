# Changelog

## [1.1.0]

### Added
- **MIME Inference Helper:** Exported `inferContentType(filename?, fallback?)` from the package root to automatically map audio and video extensions to their proper MIME types, safely defaulting to `application/octet-stream` without throwing.

### Changed
- **Automatic Content-Type Resolution:** `transcribeFile` and all compatibility helpers now infer `content_type` from filenames when omitted. Explicit `content_type` strings and browser `Blob.type` values retain strict priority over filename inference.