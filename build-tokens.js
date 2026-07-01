import fs from "node:fs";
import StyleDictionary from "style-dictionary";
import { registerFormats } from "./register-formats.js";

/**
 * Each entry is one publishable flavor. Both layer their flavor-specific
 * tokens on top of the shared core tokens.
 *
 * To add a new flavor later:
 * 1) Create subatomic-design-tokens/<flavor-name>/ with the same
 *    tier-1/tier-2/tier-3 structure as chocolate or strawberry
 * 2) Add { name: "<flavor-name>", extraSource: ["<flavor-name>"] } below
 */
const flavors = [
	{ name: "chocolate", extraSource: ["chocolate"] },
	{ name: "strawberry", extraSource: ["strawberry"] },
];

const ABSTRACTS_SOURCE = "subatomic-design-tokens/abstracts/variables.css";

registerFormats();

for (const flavor of flavors) {
	const source = [
		"subatomic-design-tokens/core/**/*.json",
		...flavor.extraSource.map((f) => `subatomic-design-tokens/${f}/**/*.json`),
	];

	const sd = new StyleDictionary({
		log: { verbosity: "verbose" },
		source,
		platforms: {
			css: {
				prefix: "ds",
				transformGroup: "css",
				buildPath: `build/${flavor.name}/css/`,
				files: [
					{
						destination: "_variables.css",
						format: "css/custom-variables",
					},
				],
			},
		},
	});

	console.log(`\n=== Building flavor: ${flavor.name} ===`);
	await sd.buildAllPlatforms();

	// Bundle the hand-authored abstracts file (breakpoints, base unit, etc.)
	// into this flavor's published output, alongside the generated tokens.
	const destination = `build/${flavor.name}/css/abstracts.css`;
	fs.copyFileSync(ABSTRACTS_SOURCE, destination);
	console.log(`✔︎ ${destination} (copied from abstracts)`);
}
