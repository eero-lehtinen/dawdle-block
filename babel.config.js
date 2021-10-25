module.exports = {
	presets: [["@babel/typescript", { jsxPragma: "h" }]],
	plugins: [
		[
			"@babel/transform-react-jsx",
			{
				runtime: "automatic",
				importSource: "preact",
			},
		],

		[
			"module-resolver",
			{
				root: ["./"],
				alias: {
					"@src": "./src",
				},
			},
		],

		// Optimize material ui bundle
		[
			"babel-plugin-import",
			{
				libraryName: "@mui/material",
				libraryDirectory: "",
				camel2DashComponentName: false,
			},
			"core",
		],
		[
			"babel-plugin-import",
			{
				libraryName: "@mui/icons-material",
				libraryDirectory: "esm",
				camel2DashComponentName: false,
			},
			"icons",
		],
		[
			"babel-plugin-import",
			{
				libraryName: "@mui/lab",
				libraryDirectory: "",
				camel2DashComponentName: false,
			},
			"lab",
		],

		"@emotion",
		"macros",
	],
	env: {
		test: {
			presets: [["@babel/preset-env", { targets: "current Node" }]],
			plugins: [
				[
					"babel-plugin-import",
					{
						libraryName: "@mui/icons-material",
						libraryDirectory: "",
						camel2DashComponentName: false,
					},
					"icons",
				],
			],
		},
	},
}
