  
const { merge } = require("webpack-merge")
const common = require("./webpack.common.js")
const targetBrowser = process.env.TARGET_BROWSER
const PACKAGE = require("./package.json")

const ZipPlugin = require("zip-webpack-plugin")

module.exports = merge(common, {
	mode: "production",
	plugins: [
		new ZipPlugin({
			path: "../",
			filename: `${targetBrowser}_v${PACKAGE.version}.zip`,
		}),
	],
})