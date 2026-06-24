import StyleDictionary from "style-dictionary";

/**
 * Helper: isHigherTierToken
 * 1) Checks whether a token comes from tier-2-usage or tier-3-component
 * 2) Used throughout to decide if a token should get the "theme" prefix
 *    vs the plain "ds-" prefix
 */
const isHigherTierToken = (filePath) => {
	return (
		filePath.includes("tier-2-usage") || filePath.includes("tier-3-component")
	);
};

/**
 * transformShadowTokens
 * 1) Box-shadow in CSS is a single shorthand value: "x y blur spread color"
 *    but in our token files, each of those properties is stored separately
 *    (box-shadow/sm/x, box-shadow/sm/blur, etc.)
 * 2) This function collects all the individual shadow properties for a given
 *    size (e.g. "sm" or "md") and combines them into one CSS custom property
 * 3) It filters the full token list down to only:
 *    - Tokens from tier-2 or tier-3 (higher tier)
 *    - Tokens whose first path segment is "box-shadow"
 *    - Tokens whose second path segment matches the requested size
 * 4) It then plucks x, y, blur, spread, and color individually by looking
 *    at the third path segment, falling back to safe defaults if any are missing
 * 5) Finally it pushes a single CSS variable into the themeTokens array,
 *    e.g. --ds-theme-box-shadow-sm: 0rem 0.25rem 0.25rem 0rem #00000040;
 */
const transformShadowTokens = (dictionary, size, themeTokens) => {
	/* 3 */
	const shadowProps = dictionary.allTokens.filter(
		(p) =>
			isHigherTierToken(p.filePath) &&
			p.path[0] === "box-shadow" &&
			p.path[1] === size
	);

	/* 4 */
	const x = shadowProps.find((p) => p.path[2] === "x")?.value || "0px";
	const y = shadowProps.find((p) => p.path[2] === "y")?.value || "0px";
	const blur = shadowProps.find((p) => p.path[2] === "blur")?.value || "0px";
	const spread = shadowProps.find((p) => p.path[2] === "spread")?.value || "0px";
	const color = shadowProps.find((p) => p.path[2] === "color")?.value || "transparent";

	/* 5 */
	themeTokens.push(`  --ds-theme-box-shadow-${size}: ${x} ${y} ${blur} ${spread} ${color};`);
};

/** 
 * css/custom-variables formatter
 * 1) Loops over every token in the dictionary and decides how to name it
 * 2) If the token comes from tier-2 or tier-3, it gets the "theme" prefix:
 *    --ds-theme-[token-name]
 *    Otherwise it gets the plain prefix: --ds-[token-name]
 * 3) Box-shadow tokens are handled separately via transformShadowTokens —
 *    we skip their individual properties here to avoid outputting
 *    --ds-theme-box-shadow-sm-x, --ds-theme-box-shadow-sm-blur, etc.
 *    and instead output a single combined shorthand per size
 * 4) All output is wrapped in a :root {} block
 */
StyleDictionary.registerFormat({
	name: "css/custom-variables",
	format: function ({ dictionary, platform }) {
		const processedShadows = new Set();
		const tier1Tokens = [];
		const themeTokens = [];

		dictionary.allTokens.forEach((token) => {
			const tokenName = token.name.replace(`${platform.prefix}-`, "");

			/**
			 * Handle box-shadow tokens
			 * 1) If this token belongs to a box-shadow group in tier-2/3,
			 *    call transformShadowTokens once per unique size (sm, md, etc.)
			 * 2) We track which sizes we've already processed in processedShadows
			 *    so we don't output duplicate combined variables
			 * 3) After calling the transform, we skip (return) so the individual
			 *    sub-properties don't also get output as separate variables
			 */
			if (isHigherTierToken(token.filePath) && token.path[0] === "box-shadow") {
				const size = token.path[1]; /* 1 */
				if (!processedShadows.has(size)) { /* 2 */
					processedShadows.add(size);
					transformShadowTokens(dictionary, size, themeTokens);
				}
				return; /* 3 */
			}

			/**
			 * Handle all other tokens
			 * 1) Tier-2/3 tokens get the "theme" prefix
			 * 2) Tier-1 tokens get the plain "ds-" prefix
			 */
			if (isHigherTierToken(token.filePath)) {
				themeTokens.push(`  --${platform.prefix}-theme-${tokenName}: ${token.value};`);
			} else {
				tier1Tokens.push(`  --${platform.prefix}-${tokenName}: ${token.value};`);
			}
		});

		/* 4 */
		return `:root {\n${[...tier1Tokens, ...themeTokens].join("\n")}\n}`;
	},
});



export default {
	log: { verbosity: "verbose" },
	source: [
		"subatomic-design-tokens/core/**/*.json",
		"subatomic-design-tokens/strawberry/**/*.json",
		"subatomic-design-tokens/chocolate/**/*.json",
	],
	platforms: {
		css: {
			prefix: "ds",
			transformGroup: "css",
			buildPath: "build/css/",
			files: [
				{
					destination: "_variables.css",
					format: "css/custom-variables",
				},
			],
		},
	},
};
