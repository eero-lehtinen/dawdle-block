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
		indent: [
			"error",
			"tab",
		],
		"linebreak-style": ["error", "unix"],
		quotes: ["error", "double"],
		semi: [
			"error",
			"never",
		],
		"no-unused-vars": [
			"error",
			{
				varsIgnorePattern: "^_",
			},
		],
		"key-spacing": ["error", { 
			beforeColon: false,
			afterColon: true,
			mode: "strict",
		}],
		"consistent-return": "error",
		eqeqeq: ["error",	"always"],
		camelcase: "error",
		"brace-style": ["error",	"stroustrup", { allowSingleLine: true	}],
		"max-len": ["error",	{ code: 120,	tabWidth: 2 }],
		"space-before-blocks": "error",
		"space-before-function-paren": ["error",	"never"],
		"space-in-parens": ["error", "never"],
		"arrow-spacing": "error",
		"object-curly-spacing": ["error", "always"],
		"array-bracket-spacing": "error",
		"comma-spacing": ["error", { "before": false, "after": true }],
		"comma-dangle": ["error", "always-multiline"],
		
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
				"no-unused-vars": "off",
				"@typescript-eslint/no-unused-vars": ["error",
					{ varsIgnorePattern: "^_"	}],
				"no-empty-function": "off",
				"@typescript-eslint/no-empty-function": ["error", {
					"allow": ["private-constructors"] }],
			},
		},
	],
}