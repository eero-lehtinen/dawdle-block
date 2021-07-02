import { BlockSets } from "./blockSets"
import { TabObserver } from "./tabObserver"

/**
 * Main class for whole background.
 */
export class Background { 
	private _tabObserver: TabObserver
	private _blockSets: BlockSets

	/**
	 * Initialize with already initialized properties.
	 * @param tabManager the tab manager
	 * @param blockSetManager the block set manager
	 */
	constructor(tabManager: TabObserver, blockSetManager: BlockSets) {
		this._tabObserver = tabManager
		this._blockSets = blockSetManager
	}

	get tabObserver(): TabObserver {
		return this._tabObserver
	}

	get blockSets(): BlockSets {
		return this._blockSets
	}
}