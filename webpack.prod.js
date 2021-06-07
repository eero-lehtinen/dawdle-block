  
const { merge } = require("webpack-merge")
const common = require("./webpack.common.js")
const targetBrowser = process.env.TARGET_BROWSER
const PACKAGE = require("./package.json")

const FileManagerPlugin = require("filemanager-webpack-plugin")

module.exports = merge(common, {
	mode: "production",
	optimization: {
		minimizer: [
			new FileManagerPlugin({
				events: {
					onEnd: {
						archive: [
							{
								format: "zip",
								source: "./dist",
								destination: `./dist/${targetBrowser}_v${PACKAGE.version}.zip`,
								options: { zlib: { level: 6 } },
							},
						],
					},
				},
			}),
		],
	},
})