  
const path = require("path")
const { CleanWebpackPlugin } = require("clean-webpack-plugin")
const CopyWebpackPlugin = require("copy-webpack-plugin")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const WebextensionPlugin = require("webpack-webextension-plugin")
const targetBrowser = process.env.TARGET_BROWSER
const PACKAGE = require("./package.json")

module.exports = {
	entry: {
		background: path.join(__dirname, "src/background/index.ts"),
		popup: path.join(__dirname, "src/popup/index.ts"),
	},
	output: {
		path: path.join(__dirname, `dist/${targetBrowser}`),
		filename: "js/[name].js",
	},
	module: {
		rules: [
			{
				exclude: /node_modules/,
				test: /\.tsx?$/,
				use: "ts-loader",
			},
			{
				exclude: /node_modules/,
				test: /\.scss$/,
				use: [
					{
						loader: "style-loader", // Creates style nodes from JS strings
					},
					{
						loader: "css-loader", // Translates CSS into CommonJS
					},
					{
						loader: "sass-loader", // Compiles Sass to CSS
					},
				],
			},
		],
	},
	resolve: {
		extensions: [".ts", ".tsx", ".js"],
		alias: {
			"@src": path.resolve(__dirname, "src/"),
		},
	},
	plugins: [
		new CleanWebpackPlugin({
			cleanOnceBeforeBuildPatterns: [
				path.resolve(__dirname, `./dist/${targetBrowser}/**/*`),
				path.resolve(__dirname, `./dist/${targetBrowser}*.zip`),
			],
			cleanStaleWebpackAssets: false,
			verbose: true,
		}),
		new HtmlWebpackPlugin({
			template: "views/popup.html",
			inject: "body",
			chunks: ["popup"],
			hash: true,
			filename: "popup.html",
		}),
		new HtmlWebpackPlugin({
			template: "views/options.html",
			inject: "body",
			chunks: ["options"],
			hash: true,
			filename: "options.html",
		}),
		new CopyWebpackPlugin({
			patterns: [{ from: "src/images", to: "images" }],
		}),
		new WebextensionPlugin({
			vendor: targetBrowser,
			autoreload: false,
			manifestDefaults: {
				version: PACKAGE.version,
			},
		}),
	],
}