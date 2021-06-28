  
const path = require("path")
const { CleanWebpackPlugin } = require("clean-webpack-plugin")
const CopyWebpackPlugin = require("copy-webpack-plugin")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const WebextensionPlugin = require("webpack-webextension-plugin")
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")
const ZipPlugin = require("zip-webpack-plugin")
const TerserPlugin = require("terser-webpack-plugin");
const PACKAGE = require("./package.json")

const getTargetsBrowserlist = (targetBrowser) => {
	if (targetBrowser === "chrome") {
		return "last 3 chrome version, last 3 edge version, last 3 opera version"
	}
	else if (targetBrowser === "firefox") {
		return "last 3 firefox version"
	}
	throw new Error("browser argument not specified")
}

const getTargetBrowser = (env) => {
	if (env.chrome) {
		return "chrome"
	}
	else if (env.firefox) {
		return "firefox"
	}
	throw new Error("invalid browser argument")
}

const getMode = (env) => {
	if (env.prod) {
		return "production"
	}
	else if (env.dev) {
		return "development"
	}
	throw new Error("invalid mode argument")
}


module.exports = (env) => {
	const targetBrowser = getTargetBrowser(env)
	const mode = getMode(env)
	const browserlist = getTargetsBrowserlist(targetBrowser)

	const config = {
		mode,
		entry: {
			background: path.join(__dirname, "src/background/index.ts"),
			popup: path.join(__dirname, "src/popup/index.tsx"),
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
										targets: browserlist, 
									}],
									["@babel/typescript", { jsxPragma: "h" }],
								],
								plugins: [
									["@babel/transform-react-jsx", {
										"runtime": "automatic",
										"importSource": "preact",
									}],
								], 
							}, 
						},
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
			extensions: [".ts", ".tsx", ".js", ".jsx"],
			alias: {
				"@src": path.resolve(__dirname, "src/"),
				"react": "preact/compat",
				"react-dom/test-utils": "preact/test-utils",
				"react-dom": "preact/compat",
			},
		},
		plugins: [
			new CleanWebpackPlugin({
				cleanOnceBeforeBuildPatterns: [
					path.resolve(__dirname, `./dist/${targetBrowser}/**/*`),
					path.resolve(__dirname, `./dist/${targetBrowser}*.zip`),
					path.resolve(__dirname, `./dist/${targetBrowser}_report.html`),
				],
				cleanStaleWebpackAssets: false,
				verbose: false,
			}),
			new HtmlWebpackPlugin({
				template: "static/views/popup.html",
				inject: "body",
				chunks: ["popup"],
				filename: "popup.html",
			}),
			new HtmlWebpackPlugin({
				template: "static/views/options.html",
				inject: "body",
				chunks: ["options"],
				filename: "options.html",
			}),
			new CopyWebpackPlugin({
				patterns: [{ from: "static/images", to: "images" }],
			}),
			new WebextensionPlugin({
				vendor: targetBrowser,
				autoreload: false,
				manifestDefaults: {
					version: PACKAGE.version,
				},
			}),
			new BundleAnalyzerPlugin({
				analyzerMode: "static",
				reportFilename: `../${targetBrowser}_report.html`,
			}),
			// type checking and eslint checking
			new ForkTsCheckerWebpackPlugin(),
		],
		optimization: {
			minimize: true,
			minimizer: [
				new TerserPlugin({
					terserOptions: {
						format: {
							comments: false,
						},
					},
					extractComments: false,
				}),
			],
		},
	}
	
	if (mode === "development") {
		config.devtool = "inline-source-map"
	}

	if (mode === "production") {
		config.plugins = [
			...config.plugins,
			new ZipPlugin({
				path: "../",
				filename: `${targetBrowser}_v${PACKAGE.version}.zip`,
			}),
			new BundleAnalyzerPlugin({
				analyzerMode: "static",
				reportFilename: `../${targetBrowser}_report.html`,
			}),
		]
	}

	return config
}