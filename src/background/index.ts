/* eslint-disable no-var, @typescript-eslint/no-unused-vars*/
import { Background } from "./background"
import { BlockSets } from "./blockSets"
import { BrowserStorage } from "./browserStorage"
import { GeneralOptions } from "./generalOptions"
import { TabObserver } from "./tabObserver"

// export background variable for usage in options and popup
declare global {
    interface Window { background: Background | undefined }
}

void (async() => {
	const browserStorage = new BrowserStorage({ preferSync: true })
	window.background = new Background({
		browserStorage,
		tabObserver: await TabObserver.create(), 
		blockSets: await BlockSets.create(browserStorage),
		generalOptions: await GeneralOptions.create(browserStorage),
	})
})()
