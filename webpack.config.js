const path = require("path")
const CopyWebpackPlugin = require("copy-webpack-plugin")
const WextManifestWebpackPlugin = require("wext-manifest-webpack-plugin")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")
const { CleanWebpackPlugin } = require("clean-webpack-plugin")
const TerserPlugin = require("terser-webpack-plugin")
const WebextensionPlugin = require("webpack-webextension-plugin")
const FilemanagerPlugin = require("filemanager-webpack-plugin")
const webpack = require("webpack")


const viewsPath = path.join(__dirname, "views")
const sourcePath = path.join(__dirname, "src")
const destPath = path.join(__dirname, "dist")
const nodeEnv = process.env.NODE_ENV || "development"
const targetBrowser = process.env.TARGET_BROWSER

module.exports = {
	devtool: false, 

	stats: {
		all: false,
		builtAt: true,
		errors: true,
		hash: true,
	},

	mode: nodeEnv,

	entry: {
		manifest: path.join(sourcePath, "manifest.json"),
		background: path.join(sourcePath, "Background", "index.ts"),
		popup: path.join(sourcePath, "Popup", "index.ts"),
		options: path.join(sourcePath, "Options", "index.ts"),
	},

	output: {
		path: path.join(destPath, targetBrowser),
		filename: "js/[name].bundle.js",
	},
	module: {
		rules: [
			{
				type: "javascript/auto", // prevent webpack handling json with its own loaders,
				test: /manifest\.json$/,
				use: {
					loader: "wext-manifest-loader",
					options: {
						usePackageJSONVersion: true, // set to false to not use package.json version for manifest
					},
				},
				exclude: /node_modules/,
			},
			{
				test: /\.(js|ts)x?$/,
				loader: "babel-loader",
				exclude: /node_modules/,
			},
			{
				test: /\.(sa|sc|c)ss$/,
				use: [
					{
						loader: MiniCssExtractPlugin.loader, // It creates a CSS file per JS file which contains CSS
					},
					{
						loader: "css-loader", // Takes the CSS files and returns the CSS with imports and url(...) for Webpack
						options: {
							sourceMap: true,
						},
					},
					{
						loader: "postcss-loader",
						options: {
							postcssOptions: {
								plugins: [
									[
										"autoprefixer",
										{
											// Options
										},
									],
								],
							},
						},
					},
					"resolve-url-loader", // Rewrites relative paths in url() statements
					"sass-loader", // Takes the Sass/SCSS file and compiles to the CSS
				],
			},
		],
	},
	resolve: {
		extensions: [".ts", ".tsx", ".js", ".json"],
		alias: {
			"webextension-polyfill-ts": path.resolve(
				path.join(__dirname, "node_modules", "webextension-polyfill-ts"),
			),
		},
	},
	plugins: [
		new WextManifestWebpackPlugin(),
		new webpack.SourceMapDevToolPlugin({ filename: false }),
		new ForkTsCheckerWebpackPlugin(),
		new webpack.EnvironmentPlugin(["NODE_ENV", "TARGET_BROWSER"]),
		new CleanWebpackPlugin({
			cleanOnceBeforeBuildPatterns: [
				`${destPath}/${targetBrowser}`,
				`${destPath}/${targetBrowser}.zip`,
			],
			cleanStaleWebpackAssets: false,
			verbose: true,
		}),
		new HtmlWebpackPlugin({
			template: path.join(viewsPath, "popup.html"),
			inject: "body",
			chunks: ["popup"],
			hash: true,
			filename: "popup.html",
		}),
		new HtmlWebpackPlugin({
			template: path.join(viewsPath, "options.html"),
			inject: "body",
			chunks: ["options"],
			hash: true,
			filename: "options.html",
		}),
		new MiniCssExtractPlugin({ filename: "css/[name].css" }),
		new CopyWebpackPlugin({
			patterns: [{ from: "src/images", to: "images" }],
		}),
		new WebextensionPlugin({
			vendor: targetBrowser,
			autoreload: false,
		}),
	],
	optimization: {
		minimize: true,
		minimizer: [
			new TerserPlugin({
				parallel: true,
				terserOptions: {
					format: {
						comments: false,
					},
				},
				extractComments: false,
			}),
			new FilemanagerPlugin({
				events: {
					onEnd: {
						archive: [
							{
								format: "zip",
								source: path.join(destPath, targetBrowser),
								destination: `${path.join(destPath, targetBrowser)}.zip`,
								options: { zlib: { level: 6 } },
							},
						],
					},
				},
			}),
		],
	},
}
