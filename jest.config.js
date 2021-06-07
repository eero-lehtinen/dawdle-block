module.exports = {
	preset: "ts-jest",
	collectCoverage: true,
	collectCoverageFrom: ["./src/**/*.ts"],
	transform: {
		"\\.(ts|js)x?$": "ts-jest",
	},
	setupFilesAfterEnv: ["./src/scripts/tests/setup-tests.ts"],
}