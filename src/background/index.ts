/* eslint-disable no-var, @typescript-eslint/no-unused-vars*/
import { Background } from "./background"
import { BlockSets } from "./blockSets"
import { BrowserStorage } from "./browserStorage"
import { TabObserver } from "./tabObserver"

// export background variable for usage in options and popup
declare global {
    interface Window { background: Background | undefined }
}

void (async() => {
	const browserStorage = new BrowserStorage({ preferSync: true })
	window.background = new Background(
		browserStorage,
		await TabObserver.create(), 
		await BlockSets.create(browserStorage),
	)
})()
