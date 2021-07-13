import { BlockSets } from "./blockSets"
import { BrowserStorage } from "./browserStorage"
import { TabLoadedEvent, TabObserver } from "./tabObserver"

/**
 * Main class for whole background.
 */
export class Background { 
	private tabObserver: TabObserver
	private _blockSets: BlockSets
	private browserStorage: BrowserStorage

	/**
	 * Initialize with already initialized properties.
	 * @param browserStorage browser storage to be used in whole background
	 * @param tabObserver
	 * @param blockSets
	 */
	private constructor(
		browserStorage: BrowserStorage, tabObserver: TabObserver, blockSets: BlockSets) {
		this.browserStorage = browserStorage
		this.tabObserver = tabObserver
		this._blockSets = blockSets

		this.tabObserver.subscribeTabLoaded(this.onTabLoaded.bind(this))
	}

	
	/** Create a background with tabObserver and blockSets loaded*/
	static async create(): Promise<Background> {
		const browserStorage = new BrowserStorage({ preferSync: true })
		return new Background(
			browserStorage, 
			await TabObserver.create(),
			await BlockSets.create(browserStorage),
		)
	}

	get blockSets(): BlockSets {
		return this._blockSets
	}

	/** listener for tab loaded event */
	private onTabLoaded(event: TabLoadedEvent) {
		console.log(event)
	}
}