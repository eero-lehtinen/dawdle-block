module.exports = {
	verbose: true,
	collectCoverage: true,
	maxWorkers: 1,
	collectCoverageFrom: ["./src/**/*.ts"],
	setupFilesAfterEnv: ["jest-extended"],
	moduleNameMapper: {
		"^react$": "preact/compat",
		"^react-dom/test-utils$": "preact/test-utils",
		"^react-dom$": "preact/compat",
	},
}