# speechweave

[![npm version](https://img.shields.io/npm/v/speechweave.svg)](https://www.npmjs.com/package/speechweave)

This is an alias package. It exists so that `npm install speechweave` without
the `@speechweave/` scope.

Install the namespaced package instead:

```bash
npm install @speechweave/node
```

Everything this package exports is re-exported directly from
[`@speechweave/node`](https://www.npmjs.com/package/@speechweave/node), so
existing code that imports from `speechweave` will keep working, but new code
should import from `@speechweave/node`.

**Docs:** [speechweave.com/docs](https://speechweave.com/docs) · [API reference](https://speechweave.com/docs/api)
