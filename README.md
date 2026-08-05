# @speechweave/node

[![npm version](https://img.shields.io/npm/v/@speechweave/node.svg)](https://www.npmjs.com/package/@speechweave/node)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The native Node.js SDK for SpeechWeave: background job polling, presigned uploads, and webhook verification. Node.js 18+.

**Docs:** [speechweave.com/docs](https://speechweave.com/docs) · [API reference](https://speechweave.com/docs/api)

## Install

```bash
npm install @speechweave/node
```

Set your API key:

```bash
export SPEECHWEAVE_API_KEY="sk_..."
```

## Quick start

```ts
import { SpeechWeave, waitForJob } from "@speechweave/node";

const sw = new SpeechWeave({ api_key: process.env.SPEECHWEAVE_API_KEY! });

const job = await sw.jobs.create({
	file: "./podcast.mp3",
	model: "core",
	service_mode: "deferred",
});

const done = await waitForJob(sw, job.id);
console.log(done.transcript);
```

`jobs.create` accepts a local path string, `Buffer`, `Blob`, or `ReadStream`. For URL input, cancel, and other job operations, see the [API reference](https://speechweave.com/docs/api).

## Translation & formatted transcripts

Translate audio to English text, or fetch a completed job's transcript formatted as `text`, `srt`, `vtt`, or `verbose_json` (word/segment timestamps):

```ts
import { SpeechWeave, waitForJob } from "@speechweave/node";

const sw = new SpeechWeave();

const job = await sw.jobs.create({ file: "./spanish_podcast.mp3", task: "translate" });
const done = await waitForJob(sw, job.id);
console.log(done.transcript); // English text, regardless of the source language

// Once a job has completed, fetch its transcript in another format
const srt = await sw.getJobFormatted(job.id, "srt");
```

## Handling buffers & streams

When audio is already in memory or you are piping a stream, use `transcribeFile` directly:

```ts
import { createReadStream } from "node:fs";
import { SpeechWeave, waitForJob } from "@speechweave/node";

const sw = new SpeechWeave();

// In-memory buffer
const fromBuffer = await sw.transcribeFile(buffer, {
	filename: "audio.wav",
	model: "core",
	language: "en",
});

// Stream from disk or a pipe
const fromStream = await sw.transcribeFile(createReadStream("./podcast.mp3"), {
	filename: "podcast.mp3",
	model: "core",
});

const done = await waitForJob(sw, fromBuffer.id, { timeout_ms: 300_000 });
console.log(done.transcript);
```

## Webhooks

```ts
import { verifyWebhook } from "@speechweave/node";

const result = verifyWebhook(
	WEBHOOK_SECRET,
	rawBody,
	signatureHeader,
);
```

Configure webhooks in the dashboard. Payloads are signed with `SpeechWeave-Signature`.

## Errors

```ts
import { SpeechWeave, SpeechWeaveError } from "@speechweave/node";

try {
	const client = new SpeechWeave({ api_key: "bad_key" });
	await client.getJob("job_123");
} catch (e) {
	if (e instanceof SpeechWeaveError) {
		console.log(e.status);
		console.log(e.code);
		console.log(e.type); // OpenAI-style category, e.g. "insufficient_quota"
		// Prepaid wallet / spend caps: HTTP 402 with codes like INSUFFICIENT_BALANCE,
		// WALLET_EMPTY, USER_SPEND_CAP_REACHED, CHECKOUT_REQUIRED, PLATFORM_SPEND_CAP_REACHED.
		if (e.status === 402 && e.code === "PLATFORM_SPEND_CAP_REACHED") {
			console.log("Monthly account limit reached; do not retry until next month.");
		} else if (e.status === 402) {
			console.log("Top up the wallet or raise spend caps, then retry.");
		// HTTP 403 with code EMAIL_UNVERIFIED: the account owning this API key hasn't
		// verified its email yet. Verify it, then retry -- the key itself is still valid.
		} else if (e.status === 403 && e.code === "EMAIL_UNVERIFIED") {
			console.log("Verify the account email before uploading or creating jobs.");
		}
	}
}
```

## Configuration

- `api_key` or set `SPEECHWEAVE_API_KEY`
- `base_url` defaults to `https://api.speechweave.com/v1`
- `fetch_func` optional custom `fetch` implementation

## Compatibility & Migration

If you are building a new application, use the native SDK above for full feature support. If you have an existing OpenAI, Deepgram, or AssemblyAI codebase, use the options below to switch with minimal changes.

### Drop-in usage

Convenience helpers if you want OpenAI/Deepgram/AssemblyAI response shapes without adding another package. They use presigned uploads like the native API.

```ts
const { text } = await client.audio.transcriptions.create({
	file: buffer,
	filename: "clip.mp3",
	model: "core",
});
```

Pass `wait: false` to return the created job without polling.

Uploads go straight to storage the same way `jobs.create` does, so this supports files up to the same **250 MB** self-serve limit.

More examples: [OpenAI](https://speechweave.com/docs/migration/openai) · [Deepgram](https://speechweave.com/docs/migration/deepgram) · [AssemblyAI](https://speechweave.com/docs/migration/assemblyai)

### Migrating from OpenAI

You don't need this SDK for a quick swap, use the official `openai` package and point it at SpeechWeave:

```ts
import fs from "node:fs";
import OpenAI from "openai";

const client = new OpenAI({
	apiKey: process.env.SPEECHWEAVE_API_KEY!,
	baseURL: "https://api.speechweave.com/v1",
});

const result = await client.audio.transcriptions.create({
	file: fs.createReadStream("clip.mp3"),
	model: "core",
});

console.log(result.text);
```

`client.audio.translations.create({ file, model: "core" })` works the same way for translating audio into English text; OpenAI's translations endpoint has no `language` parameter, the source language is always auto-detected.

> **Upload size:** this path posts through the same wire format as the official OpenAI client, so it's capped at **90 MB** per file to stay under standard upload limits. For anything larger, switch to `client.audio.transcriptions.create(...)` from this SDK's drop-in helpers above: same call shape, and it unlocks the full 250 MB limit because uploads go straight to storage instead.

OpenAI model names like `whisper-1` are aliased to `core` on our backend. See the [OpenAI migration guide](https://speechweave.com/docs/migration/openai).
