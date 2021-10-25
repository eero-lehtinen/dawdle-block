import ms from "ms.macro"

/**
 * Returns milliseconds since last midnight. E.g. if it's 1 AM, returns 60 * 60 * 1000 milliseconds.
 * @param date input date object to convert
 * @returns milliseconds
 */
export const dateToTodayMS = (date: Date): number =>
	date.getMilliseconds() +
	date.getSeconds() * ms("1s") +
	date.getMinutes() * ms("1min") +
	date.getHours() * ms("1h")

/**
 * Waits for milliseconds, then resolves
 * @param ms
 * @returns
 */
export const sleep = (ms: number): Promise<void> => {
	return new Promise(resolve => setTimeout(resolve, ms))
}

/** Clamp `num` to be between `a` and `b` */
export const clamp = (num: number, a: number, b: number): number =>
	Math.max(Math.min(num, Math.max(a, b)), Math.min(a, b))

/**
 * Apply debounce functionality to given func.
 * Calls `func` after `wait` ms of no activity.
 * Can be awaited or called normally.
 */
export const debounce = <T extends unknown[], U>(
	func: (...args: T) => PromiseLike<U> | U,
	wait: number
): ((...args: T) => Promise<U>) => {
	let timer: ReturnType<typeof setTimeout>

	return (...args: T): Promise<U> => {
		clearTimeout(timer)
		return new Promise(resolve => {
			timer = setTimeout(() => resolve(func(...args)), wait)
		})
	}
}
