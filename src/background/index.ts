/* eslint-disable no-var, @typescript-eslint/no-unused-vars*/
import { Background } from "./background"
import { BlockSets } from "./blockSets"
import { TabObserver } from "./tabObserver"

// export bg variable for usage in options and popup
var bg 
void (async() => {
	bg = new Background(await TabObserver.create(), await BlockSets.create())
})()

