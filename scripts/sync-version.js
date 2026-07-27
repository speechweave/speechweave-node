import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath( new URL( "..", import.meta.url ) );
const pkg = JSON.parse( readFileSync( `${ root }package.json`, "utf8" ) );

writeFileSync(
	`${ root }src/version.ts`,
	`export const VERSION = "${ pkg.version }";\n`,
);
