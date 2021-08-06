module.exports = {
	plugins: [],
	extends: ["eslint:recommended", "preact"],
	parserOptions: {
		project: "./tsconfig.json",
		ecmaVersion: 12,
		sourceType: "module",
	},
	ignorePatterns: ["legacy/**/*", "dist/**/*", "coverage/**/*", "static/**/*"],
	env: {
		webextensions: true,
		browser: true,
		node: true,
		amd: true,
		es2021: true,
	},
	globals: {
		JSX: "readonly",
	},
	rules: {
		"consistent-return": "error",
		eqeqeq: ["error", "always"],
		camelcase: "error",
		"max-len": ["error", { code: 100, tabWidth: 2, ignorePattern: "^\\s*// eslint-.*$" }],
		"jest/expect-expect": ["error", { assertFunctionNames: ["expect*", "**.expect"] }],
	},
	overrides: [
		{
			files: ["*.ts", "*.tsx"],
			parser: "@typescript-eslint/parser",
			plugins: ["@typescript-eslint", "jsdoc"],
			extends: ["plugin:@typescript-eslint/recommended"],
			rules: {
				"no-unused-vars": "off",
				"@typescript-eslint/no-unused-vars": [
					"error",
					{
						varsIgnorePattern: "^_",
						argsIgnorePattern: "^_",
						ignoreRestSiblings: true,
					},
				],
				"no-empty-function": "off",
				"@typescript-eslint/no-empty-function": [
					"error",
					{
						allow: ["private-constructors"],
					},
				],
				"@typescript-eslint/type-annotation-spacing": "error",
				"jsdoc/require-jsdoc": [
					"warn",
					{
						// Require top level function comments
						contexts: [
							"Program > ExportNamedDeclaration > VariableDeclaration" +
								" > VariableDeclarator > ArrowFunctionExpression",
							"Program > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression",
						],
						// Require class declaration and method comments
						require: {
							ClassDeclaration: true,
							MethodDefinition: true,
						},
						publicOnly: false,
						exemptEmptyFunctions: true,
						enableFixer: false,
						checkGetters: false,
						checkSetters: false,
					},
				],
				"no-useless-constructor": "off",
				"@typescript-eslint/no-useless-constructor": ["error"],
				"@typescript-eslint/prefer-nullish-coalescing": "error",
				"@typescript-eslint/strict-boolean-expressions": "error",
				"@typescript-eslint/no-floating-promises": "error",
				"require-await": "off",
				"@typescript-eslint/require-await": "error",
			},
		},
		{
			files: ["*.ts", "*.tsx", ".js", ".jsx"],
			extends: ["prettier"],
		},
	],
}
