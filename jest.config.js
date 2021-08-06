module.exports = {
	collectCoverage: true,
	maxWorkers: 1,
	collectCoverageFrom: ["./src/**/*.ts"],
	setupFilesAfterEnv: ["./tests/setup.ts"],
	moduleNameMapper: {
		"^react$": "preact/compat",
		"^react-dom/test-utils$": "preact/test-utils",
		"^react-dom$": "preact/compat",
		"^react/jsx-runtime$": "preact/compat/jsx-runtime",
	},
}
