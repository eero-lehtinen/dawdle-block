export const timeToMSSinceMidnight = (time: Date): number =>
	time.getSeconds() * 1000 + time.getMinutes() * 60000 + time.getHours() * 3600000