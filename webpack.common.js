  
const path = require("path")
const { CleanWebpackPlugin } = require("clean-webpack-plugin")
const CopyWebpackPlugin = require("copy-webpack-plugin")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const WebextensionPlugin = require("webpack-webextension-plugin")
const targetBrowser = process.env.TARGET_BROWSER
const PACKAGE = require("./package.json")

const getTargets = () => {
	if (targetBrowser === "chrome") {
		return "last 3 chrome version, last 3 edge version, last 3 opera version"
	}
	else if (targetBrowser === "firefox") {
		return "last 3 firefox version, last 3 and_ff version"
	}
	throw new Error("No target browser specified")
}


module.exports = {
	entry: {
		background: path.join(__dirname, "src/scripts/background/index.ts"),
		popup: path.join(__dirname, "src/scripts/popup/index.ts"),
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
				use: [
					{ loader: "babel-loader",
						options: {
							cacheDirectory: true,
							presets: [
								["@babel/preset-env", { 
									useBuiltIns: "entry",
									corejs: { version: "3.15", proposals: true },
									targets: getTargets(), 
								}],
								"@babel/preset-typescript",
							] }, 
					},
					{ loader: "ts-loader" },
				],
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
			verbose: false,
		}),
		new HtmlWebpackPlugin({
			template: "src/views/popup.html",
			inject: "body",
			chunks: ["popup"],
			hash: true,
			filename: "popup.html",
		}),
		new HtmlWebpackPlugin({
			template: "src/views/options.html",
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