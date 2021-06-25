module.exports = {
	plugins: [],
	extends: [
		"eslint:recommended",
	],
	parserOptions: {
		project: "./tsconfig.json",
		ecmaVersion: 12,
		sourceType: "module",
	},
	ignorePatterns: [
		"libraries/**/*",
		"dist/**/*",
		"js/**/*",
	],
	env: {
		webextensions: true,
		jquery: true,
		browser: true,
		node: true,
		amd: true,
		es2021: true,
	},
	rules: {
		indent: ["error", "tab"],
		"linebreak-style": ["error", "unix"],
		quotes: ["error", "double"],
		"key-spacing": ["error", { 
			beforeColon: false,
			afterColon: true,
			mode: "strict",
		}],
		"consistent-return": "error",
		eqeqeq: ["error",	"always"],
		camelcase: "error",
		"brace-style": ["error",	"stroustrup", { allowSingleLine: true	}],
		"max-len": ["error",	{ code: 100,	tabWidth: 2, ignorePattern: "^\\s*// eslint-.*$" }],
		"space-before-blocks": "error",
		"space-before-function-paren": ["error",	"never"],
		"space-in-parens": ["error", "never"],
		"arrow-spacing": "error",
		"object-curly-spacing": ["error", "always"],
		"array-bracket-spacing": ["error", "never"],
		"comma-spacing": ["error", { "before": false, "after": true }],
		"comma-dangle": ["error", "always-multiline"],
		"space-infix-ops": "error",
	},
	overrides: [
		{
			files: [
				"*.ts",
				"*.tsx",
			],
			parser: "@typescript-eslint/parser",
			plugins: ["@typescript-eslint"],
			extends: ["plugin:@typescript-eslint/recommended"],
			rules: {
				"@typescript-eslint/no-unused-vars": ["error",
					{ varsIgnorePattern: "^_", argsIgnorePattern: "^_"	}],
				"@typescript-eslint/no-empty-function": ["error", {
					"allow": ["private-constructors"] }],
				"@typescript-eslint/type-annotation-spacing": "error",
				"@typescript-eslint/semi": ["error", "never"],
			},
		},
	],
}