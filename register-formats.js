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
 * registerFormats
 * Call once before building any flavor. Registering the same format name
 * twice throws, so build-tokens.js only calls this a single time up front.
 */
export function registerFormats() {
	StyleDictionary.registerFormat({
		name: "css/custom-variables",
		format: function ({ dictionary, platform }) {
			const processedShadows = new Set();
			const tier1Tokens = [];
			const themeTokens = [];

			dictionary.allTokens.forEach((token) => {
				const tokenName = token.name.replace(`${platform.prefix}-`, "");

				if (isHigherTierToken(token.filePath) && token.path[0] === "box-shadow") {
					const size = token.path[1];
					if (!processedShadows.has(size)) {
						processedShadows.add(size);
						transformShadowTokens(dictionary, size, themeTokens);
					}
					return;
				}

				if (isHigherTierToken(token.filePath)) {
					themeTokens.push(`  --${platform.prefix}-theme-${tokenName}: ${token.value};`);
				} else {
					tier1Tokens.push(`  --${platform.prefix}-${tokenName}: ${token.value};`);
				}
			});

			return `:root {\n${[...tier1Tokens, ...themeTokens].join("\n")}\n}`;
		},
	});
}
