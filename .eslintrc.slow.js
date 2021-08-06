// These rules are useful, but way too slow to execute continuously
// (as shown by command "TIMING=1 eslint -c .eslintrc.slow.js .")
// This is because they rely on type information provided by slow typescript parser.
module.exports = {
	plugins: [],
	parserOptions: {
		project: "./tsconfig.json",
	},
	extends: [
		"./.eslintrc.js",	
	],
	overrides: [
		{
			files: [
				"*.ts",
				"*.tsx",
			],
			parser: "@typescript-eslint/parser",
			plugins: ["@typescript-eslint"],
			rules: {
				"@typescript-eslint/prefer-nullish-coalescing": "error",
				"@typescript-eslint/strict-boolean-expressions": "error",
				"@typescript-eslint/no-floating-promises": "error",
			},
		},
	],
}