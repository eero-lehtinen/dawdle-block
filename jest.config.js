module.exports = {
	preset: "ts-jest",
	collectCoverage: true,
	collectCoverageFrom: ["./src/**/*.ts"],
	setupFilesAfterEnv: ["./tests/setup.ts"],
}