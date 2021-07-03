/* eslint-disable no-var, @typescript-eslint/no-unused-vars*/
import { Background } from "./background"
import { BlockSets } from "./blockSets"
import { TabObserver } from "./tabObserver"

// export background variable for usage in options and popup
declare global {
    interface Window { background: Background | undefined }
}

void (async() => {
	window.background = new Background(await TabObserver.create(), await BlockSets.create())
})()
