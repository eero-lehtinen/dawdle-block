module.exports = {
	preset: "ts-jest",
	verbose: true,
	collectCoverage: true,
	collectCoverageFrom: ["./src/**/*.ts"],
	setupFilesAfterEnv: ["./tests/setup.ts"],
}