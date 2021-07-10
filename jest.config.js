module.exports = {
	preset: "ts-jest",
	verbose: true,
	collectCoverage: true,
	maxWorkers: 1,
	collectCoverageFrom: ["./src/**/*.{ts,tsx}"],
	setupFilesAfterEnv: ["./tests/setup.ts"],
	globals: {
		"ts-jest": {
			isolatedModules: true,
			babelConfig: true,
		},
	},
	moduleNameMapper: {
		"^react$": "preact/compat",
		"^react-dom/test-utils$": "preact/test-utils",
		"^react-dom$": "preact/compat",
	},
}