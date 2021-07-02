
import { timeToMSSinceMidnight, sleep } from "../src/shared/utils"

describe("test time to ms since midnight", () => {
	it("converts basic examples correctly", () => {
		expect(timeToMSSinceMidnight(new Date("2000-01-01T00:00:00"))).toStrictEqual(0)
		expect(timeToMSSinceMidnight(new Date("2000-01-01T00:00:05"))).toStrictEqual(5 * 1000)
		expect(timeToMSSinceMidnight(new Date("2000-01-01T00:05:00"))).toStrictEqual(5 * 60000)
		expect(timeToMSSinceMidnight(new Date("2000-01-01T05:00:00"))).toStrictEqual(5 * 3600000)
	})
})

describe("test sleep", () => {
	beforeEach(() => { jest.useFakeTimers() })
	afterEach(() => { jest.useRealTimers() })

	it("waits milliseconds based on parameters, then resolves", async() => {
		const spy = jest.fn()
		void sleep(100).then(spy)

		jest.advanceTimersByTime(80)
		await Promise.resolve()
		expect(spy).not.toHaveBeenCalled()

		jest.advanceTimersByTime(20)
		await Promise.resolve()
		expect(spy).toHaveBeenCalled()
	})
})
