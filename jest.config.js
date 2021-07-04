module.exports = {
	preset: "ts-jest",
	verbose: true,
	collectCoverage: true,
	maxWorkers: 1,
	collectCoverageFrom: ["./src/**/*.ts"],
	setupFilesAfterEnv: ["./tests/setup.ts"],
	globals: {
		"ts-jest": {
			isolatedModules: true,
		},
	},
}