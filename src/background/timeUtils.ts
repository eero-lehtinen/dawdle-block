/**
 * Returns milliseconds since last midnight. E.g. if it's 1 AM, returns 60*60*1000 milliseconds.
 * @param time input date object to convert
 * @returns milliseconds
 */
export const timeToMSSinceMidnight = (time: Date): number =>
	time.getMilliseconds() + time.getSeconds() * 1000 + 
		time.getMinutes() * 60000 + time.getHours() * 3600000