// Only used in testing. Build configuration is in webpack.config.js.
module.exports = {
	env: {
		test: {
			presets: [
				["@babel/preset-env", { targets: { node: "current" } }],
				"@babel/preset-typescript",
			],
			plugins: ["@babel/plugin-transform-modules-commonjs"],
		},
	},
}