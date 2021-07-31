
module.exports = {
	presets: [
		["@babel/typescript", { jsxPragma: "h" }],
	],
	plugins: [
		["@babel/transform-react-jsx", {
			runtime: "automatic",
			importSource: "preact",
		}],

		["module-resolver", {
			root: ["./"],
			alias: {
				"@src": "./src",
			},
		}],

		// Optimize material ui bundle
		["babel-plugin-import", {
			libraryName: "@material-ui/core",
			libraryDirectory: "",
			camel2DashComponentName: false,
		}, "core"],
		["babel-plugin-import",	{
			libraryName: "@material-ui/icons",
			libraryDirectory: "esm",
			camel2DashComponentName: false,
		}, "icons"],
		["babel-plugin-import",	{
			libraryName: "@material-ui/lab",
			libraryDirectory: "",
			camel2DashComponentName: false,
		}, "lab"],

		"@emotion",
		"macros",
	],
	env: {
		test: {
			presets: [
				["@babel/preset-env", { targets: { node: "current" } }],
			],
		},
	},
}