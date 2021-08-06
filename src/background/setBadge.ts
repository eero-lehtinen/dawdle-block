import { browser, BrowserAction } from "webextension-polyfill-ts"
import ms from "ms.macro"

export const orange: BrowserAction.ColorArray = [215, 134, 29, 255]
export const red: BrowserAction.ColorArray = [215, 41, 29, 255]
export const grey: BrowserAction.ColorArray = [123, 123, 123, 255]

/**
 * Display badge next to extension icon in browser top bar.
 * If msTimeLeft is infinity, hides the badge.
 */
export const setBadge = async (msTimeLeft: number): Promise<void> => {
	if (msTimeLeft === Infinity) {
		// Badge is cleared when empty string is passed
		await browser.browserAction.setBadgeText({ text: "" })
		return
	}

	let text: string
	let color: BrowserAction.ColorArray
	// Time is more than one hour -> display grey empty box
	if (msTimeLeft > ms("1h")) {
		text = " "
		color = grey
	}
	// Tore than one minute -> display time in minutes in orange box
	else if (msTimeLeft > ms("1min")) {
		text = Math.floor(msTimeLeft / ms("1min")).toString()
		color = orange
	}
	// time is positive -> display time left in seconds
	else if (msTimeLeft >= 0) {
		color = red
		text = Math.floor(msTimeLeft / ms("1s")).toString()
	}
	// Time is negative -> show exclamation marks because annoy banner will show the overtime
	else {
		color = red
		text = "!!"
	}

	await browser.browserAction.setBadgeText({ text })
	await browser.browserAction.setBadgeBackgroundColor({ color })
}
