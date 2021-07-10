
module.exports = {
	presets: [
		["@babel/typescript", { jsxPragma: "h" }],
	],
	plugins: [
		["@babel/transform-react-jsx", {
			"runtime": "automatic",
			"importSource": "preact",
		}],
		// Optimize material ui bundle
		["babel-plugin-transform-imports", {
			"@material-ui/core": {
				transform: "@material-ui/core/${member}",
				preventFullImport: true,
			},
			"@material-ui/icons": {
				transform: "@material-ui/icons/${member}",
				preventFullImport: true,
			},
		}],
		"@emotion",
	],
	env: {
		test: {
			presets: [
				["@babel/preset-env", { targets: { node: "current" } }],
			],
		},
	},
}