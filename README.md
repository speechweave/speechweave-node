# @speechweave/node

[![npm version](https://img.shields.io/npm/v/@speechweave/node.svg)](https://www.npmjs.com/package/@speechweave/node)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The native Node.js SDK for SpeechWeave — background job polling, presigned uploads, and webhook verification. Node.js 18+.

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

const client = new SpeechWeave();

const job = await client.transcribeFile(buffer, {
	filename: "audio.wav",
	model: "core",
	language: "en",
});

const result = await waitForJob(client, job.id, { timeout_ms: 300_000 });
console.log(result.transcript);
```

For `jobs.create`, URL input, cancel, and other job operations, see the [API reference](https://speechweave.com/docs/api).

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
	}
}
```

## Configuration

- `api_key` — or set `SPEECHWEAVE_API_KEY`
- `base_url` — defaults to `https://api.speechweave.com/v1`
- `fetch_func` — optional custom `fetch` implementation

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

More examples: [OpenAI](https://speechweave.com/docs/migration/openai) · [Deepgram](https://speechweave.com/docs/migration/deepgram) · [AssemblyAI](https://speechweave.com/docs/migration/assemblyai)

### Migrating from OpenAI

You don't need this SDK for a quick swap — use the official `openai` package and point it at SpeechWeave:

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

OpenAI model names like `whisper-1` are aliased to `core` on our backend. See the [OpenAI migration guide](https://speechweave.com/docs/migration/openai).
