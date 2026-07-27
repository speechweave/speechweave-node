import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath( new URL( "..", import.meta.url ) );
const pkg = JSON.parse( readFileSync( `${ root }package.json`, "utf8" ) );

writeFileSync(
	`${ root }src/version.ts`,
	`export const VERSION = "${ pkg.version }";\n`,
);

// Keep the `speechweave` npm_alias package pinned to the exact same
// version + dependency, so it always ships in lockstep with @speechweave/node.
const aliasPkgPath = `${ root }npm_alias/package.json`;
const aliasPkg = JSON.parse( readFileSync( aliasPkgPath, "utf8" ) );

aliasPkg.version = pkg.version;
aliasPkg.dependencies[ "@speechweave/node" ] = pkg.version;

writeFileSync( aliasPkgPath, `${ JSON.stringify( aliasPkg, null, 2 ) }\n` );
