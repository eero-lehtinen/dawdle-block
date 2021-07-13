import { BlockSets } from "./blockSets"
import { BrowserStorage } from "./browserStorage"
import { TabLoadedEvent, TabObserver, TabRemovedEvent } from "./tabObserver"
import { getYtInfo, YTInfo } from "./youtubeAPI"

const updateInterval = 1000

interface TabInfo {
	url: URL, 
	ytInfo: YTInfo,
	blockedBy: number[],
}

/**
 * Main class for whole background.
 */
export class Background { 
	private tabObserver: TabObserver
	private _blockSets: BlockSets
	private browserStorage: BrowserStorage
	private tabInfoCache: Map<number, TabInfo> = new Map()

	/**
	 * Initialize with already initialized properties.
	 * @param browserStorage browser storage to be used in whole background
	 * @param tabObserver
	 * @param blockSets
	 */
	constructor(
		browserStorage: BrowserStorage, tabObserver: TabObserver, blockSets: BlockSets) {
		this.browserStorage = browserStorage
		this.tabObserver = tabObserver
		this._blockSets = blockSets

		this.tabObserver.subscribeTabLoaded(this.onTabLoaded.bind(this))
		this.tabObserver.subscribeTabRemoved(this.onTabRemoved.bind(this))
		
		setInterval(this.update.bind(this), updateInterval)
	}

	get blockSets(): BlockSets {
		return this._blockSets
	}

	/** listener for tab loaded event */
	private async onTabLoaded(event: TabLoadedEvent) {
		const url = new URL(event.url)
		const ytInfo = await getYtInfo(url)
		const blockedBy = this.blockSets.blockedBy(
			event.url.replace(/(^\w+:|^)\/\//, ""), // remove protocol
			ytInfo.channelId, 
			ytInfo.categoryId,
		)
		this.tabInfoCache.set(event.id, { url, ytInfo, blockedBy })
	}

	/** listener for tab removed event */
	private onTabRemoved(event: TabRemovedEvent) {
		this.tabInfoCache.delete(event.id)
	}

	private update() {
		//asd
	}
}