import { dateToTodayMS, sleep, clamp, debounce } from "@src/shared/utils"
import ms from "ms.macro"

describe("test date to today ms", () => {
	test("converts basic examples correctly", () => {
		expect(dateToTodayMS(new Date("2000-01-01T00:00:00"))).toStrictEqual(0)
		expect(dateToTodayMS(new Date("2000-01-01T00:00:05"))).toStrictEqual(ms("5s"))
		expect(dateToTodayMS(new Date("2000-01-01T00:05:00"))).toStrictEqual(ms("5m"))
		expect(dateToTodayMS(new Date("2000-01-01T05:00:00"))).toStrictEqual(ms("5h"))
	})
})

describe("test sleep", () => {
	jest.useFakeTimers()

	afterEach(() => jest.clearAllTimers())

	test("waits milliseconds based on parameters, then resolves", async () => {
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

test("clamp", () => {
	expect(clamp(5, 0, 10)).toBe(5)
	expect(clamp(-5, 0, 10)).toBe(0)
	expect(clamp(15, 0, 10)).toBe(10)
})

describe("test debounce", () => {
	jest.useFakeTimers()
	afterEach(() => jest.clearAllTimers())
	const wait = ms("10ms")

	test("when calling once, function gets called once after wait", () => {
		const spy = jest.fn()
		const debounced = debounce(spy, wait)
		void debounced()
		expect(spy).not.toBeCalled()
		jest.advanceTimersByTime(wait)
		expect(spy).toBeCalledTimes(1)
	})

	test("when calling multiple times, function gets called once after wait", () => {
		const spy = jest.fn()
		const debounced = debounce(spy, wait)
		void debounced()
		void debounced()
		void debounced()
		expect(spy).not.toBeCalled()
		jest.advanceTimersByTime(wait)
		expect(spy).toBeCalledTimes(1)
	})

	test("works like a promise if we want to wait for next call", async () => {
		jest.useRealTimers()
		const spy = jest.fn()
		const debounced = debounce(spy, wait)
		await debounced()
		expect(spy).toBeCalledTimes(1)
	})
})
