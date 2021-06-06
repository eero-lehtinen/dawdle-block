const path = require("path")
const CopyPlugin = require("copy-webpack-plugin")


module.exports = {
	entry: {
		bg: "./src/scripts/main.ts",
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: "ts-loader",
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js"],
	},
	output: {
		path: path.join(path.resolve(__dirname), "dist"),
		filename: "[name].js"
	},
	plugins: [
		new CopyPlugin({
			patterns: [
				{ from: "manifest.json" },
				{ from: "node_modules/webextension-polyfill/dist/browser-polyfill.js" },
				{ from: "options.html" },
				{ from: "images", to: "images" },
			],
		})
	]
}
