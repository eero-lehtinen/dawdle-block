export function defaultBlockset() {
	return {
		name: "Block set 1",
		requireActive: false,
		annoyMode: false,
		timeAllowed: 600000, // milliseconds
		resetTime: 0, // milliseconds from midnight
		lastReset: (new Date()).getTime(), // millisecods from 1970
		activeDays: [true, true, true, true, true, true, true],
		activeTime: { from: 0, to: 0 }, // milliseconds from midnight
		blacklist: [],
		whitelist: []
	}
}