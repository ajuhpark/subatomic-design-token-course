import fs from "node:fs";
import StyleDictionary from "style-dictionary";
import { registerFormats } from "./register-formats.js";

/**
 * Each entry is one publishable package. packageName and description here
 * must stay in sync with the matching tokens-package.<name>.json file —
 * both are the source of truth for the published package's identity.
 *
 * To add a new flavor later:
 * 1) Create subatomic-design-tokens/<flavor-name>/ with the same
 *    tier-1/tier-2/tier-3 structure as chocolate or strawberry
 * 2) Add an entry below, and create a matching tokens-package.<flavor-name>.json
 */
const flavors = [
	{
		name: "core",
		extraSource: [],
		packageName: "@andrewjypark/subatomic-design-tokens-core",
		description: "Core (base) CSS design tokens for the Subatomic design system, with no flavor applied.",
	},
	{
		name: "chocolate",
		extraSource: ["chocolate"],
		packageName: "@andrewjypark/subatomic-design-tokens-chocolate",
		description: "Chocolate theme CSS design tokens for the Subatomic design system.",
	},
	{
		name: "strawberry",
		extraSource: ["strawberry"],
		packageName: "@andrewjypark/subatomic-design-tokens-strawberry",
		description: "Strawberry theme CSS design tokens for the Subatomic design system.",
	},
];

const ABSTRACTS_SOURCE = "subatomic-design-tokens/abstracts/variables.css";

/**
 * Generates the README.md that ships inside the published package.
 * npm reads this file straight from the tarball, so it has to be written
 * into build/<flavor>/ before publish, same as the CSS and package.json.
 */
function readmeTemplate(flavor) {
	return `# ${flavor.packageName}

${flavor.description}

## Install

\`\`\`bash
npm install ${flavor.packageName}
\`\`\`

## Usage

Import the CSS custom properties into your stylesheet:

\`\`\`css
@import "${flavor.packageName}/css/_variables.css";
@import "${flavor.packageName}/css/abstracts.css";
\`\`\`

- \`css/_variables.css\` — generated design tokens (colors, spacing, typography, etc.)
- \`css/abstracts.css\` — base/breakpoint variables shared across all flavors

## License

MIT
`;
}

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
	const abstractsDestination = `build/${flavor.name}/css/abstracts.css`;
	fs.copyFileSync(ABSTRACTS_SOURCE, abstractsDestination);
	console.log(`✔︎ ${abstractsDestination} (copied from abstracts)`);

	// Write the README that will ship inside this flavor's published package.
	const readmeDestination = `build/${flavor.name}/README.md`;
	fs.writeFileSync(readmeDestination, readmeTemplate(flavor));
	console.log(`✔︎ ${readmeDestination} (generated)`);
}
