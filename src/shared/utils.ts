import ms from "ms.macro"

/**
 * Returns milliseconds since last midnight. E.g. if it's 1 AM, returns 60*60*1000 milliseconds.
 * @param time input date object to convert
 * @returns milliseconds
 */
export const timeToMSSinceMidnight = (time: Date): number =>
	time.getMilliseconds() +
	time.getSeconds() * ms("1s") +
	time.getMinutes() * ms("1min") +
	time.getHours() * ms("1h")

/**
 * Waits for milliseconds, then resolves
 * @param ms
 * @returns
 */
export const sleep = (ms: number): Promise<void> => {
	return new Promise(resolve => setTimeout(resolve, ms))
}
