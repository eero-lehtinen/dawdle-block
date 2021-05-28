{
	"plugins": [],
	"extends": [
		"eslint:recommended"
	],
	"parserOptions": {
		"project": "./tsconfig.json",
		"ecmaVersion": 12,
		"sourceType": "module"
	},
	"ignorePatterns": [
		"libraries/**/*",
		"dist/**/*"
	],
	"env": {
		"webextensions": true,
		"jquery": true,
		"browser": true,
		"node": true,
		"amd": true,
		"es2021": true
	},
	"rules": {
		"indent": [
			"error",
			"tab"
		],
		"linebreak-style": [
			"error",
			"unix"
		],
		"quotes": [
			"error",
			"double"
		],
		"semi": [
			"error",
			"never"
		],
		"no-unused-vars": [
			"error",
			{
				"argsIgnorePattern": "^_"
			}
		],
		"consistent-return": "error",
		"eqeqeq": [
			"error",
			"always"
		],
		"camelcase": "error",
		"brace-style": [
			"error",
			"stroustrup",
			{
				"allowSingleLine": true
			}
		],
		"max-len": [
			"error",
			{
				"code": 120,
				"tabWidth": 2
			}
		],
		"space-before-blocks": "error",
		"space-before-function-paren": [
			"error",
			"never"
		],
		"space-in-parens": [
			"error",
			"never"
		],
		"arrow-spacing": "error"
	},
	"overrides": [
		{
			"files": [
				"*.ts",
				"*.tsx"
			],
			"parser": "@typescript-eslint/parser",
			"plugins": [
				"@typescript-eslint"
			],
			"extends": [
				"plugin:@typescript-eslint/recommended"
			]
		}
	]
}