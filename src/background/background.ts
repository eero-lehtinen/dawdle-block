import { BlockSet, BlockSetState } from "./blockSet"
import { BlockSets } from "./blockSets"
import { BrowserStorage } from "./browserStorage"
import { TabLoadedEvent, TabObserver, TabRemovedEvent } from "./tabObserver"
import { getYTInfo, nullYTInfo, YTInfo } from "./youtubeAPI"
import { blockTab, isBlockPage } from "@src/background/blockTab"

export const updateInterval = 1000

interface TabInfo {
	url: string, 
	ytInfo: YTInfo,
	blockedBy: number[],
}

interface BlockSetInfo {
	affectedTabIds: number[]
}

/*enum TabUpdateType {
	Annoy,
	Block,
}

interface TabUpdateAnnoy {
	type: TabUpdateType.Annoy,
	timeElapsed: number,
}

interface TabUpdateBlock {
	type: TabUpdateType.Block,
	timeElapsed: number,
}

type TabUpdateResult = TabUpdateAnnoy | TabUpdateBlock*/

/**
 * Main class for whole background.
 */
export class Background { 
	private tabObserver: TabObserver
	private _blockSets: BlockSets
	private browserStorage: BrowserStorage
	private tabInfoCache: Map<number, TabInfo> = new Map()
	private blockSetInfoCache: Map<number, BlockSetInfo> = new Map()

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

		this.tabObserver.subscribeTabLoaded(async(event: TabLoadedEvent) => {
			await this.updateTabInfo({ id: event.tabId, url: event.url })
		})
		this.tabObserver.subscribeTabRemoved((event: TabRemovedEvent) => {
			this.removeTabInfo(event.tabId)
		})
		
		setInterval(() => this.update(), updateInterval)
	}

	get blockSets(): BlockSets {
		return this._blockSets
	}

	/**  Precalculate blocking for tab to be easily processed in update function.*/
	private async updateTabInfo(tab: {id: number, url: string}) {
		let ytInfo: YTInfo
		try {
			const urlObj = new URL(tab.url)
			ytInfo = await getYTInfo(urlObj)
		}
		catch(err) {
			// catch when URL is not valid
			ytInfo = nullYTInfo()
		}
		const blockedBy = isBlockPage(tab.url) ? [] :
			this.blockSets.blockedBy(
				tab.url.replace(/(^\w+:|^)\/\//, ""), // remove protocol
				ytInfo.channelId, 
				ytInfo.categoryId,
			)
		this.tabInfoCache.set(tab.id, { url: tab.url, ytInfo, blockedBy })
	}

	/** listener for tab removed event */
	private removeTabInfo(tabId: number) {
		this.tabInfoCache.delete(tabId)
	}

	private update() {
		// bs: requireActive = (true | false)
		// bs: annoyMode = (true | false)
		// bs tila: time left, block, overtime
		// blockedBy list
		// tab: active = (true | false)

		const activeTabIds = this.tabObserver.getActiveTabIds()

		const incrementedBlockSetIds = new Set<number>()
		const blockedTabIds = new Set<number>()

		const incrementIfNeeded = (blockSet: BlockSet) => {
			if (!incrementedBlockSetIds.has(blockSet.id) &&
			 [BlockSetState.TimeLeft, BlockSetState.OverTime].includes(blockSet.getState())) {
				blockSet.timeElapsed += updateInterval
				incrementedBlockSetIds.add(blockSet.id)
			}
		}

		const blockIfNeeded = (tabId: number, blockSet: BlockSet) => {
			if (!blockedTabIds.has(tabId) && 
				blockSet.getState() === BlockSetState.Block) {
				blockTab(tabId)
				blockedTabIds.add(tabId)
			}
		}

		for (const [tabId, tabInfo] of this.tabInfoCache) {
			const isActive = activeTabIds.includes(tabId)
			
			for (const blockSetId of tabInfo.blockedBy) {
				const blockSet = this._blockSets.map.get(blockSetId)
				if (blockSet === undefined) continue

				incrementIfNeeded(blockSet)

				if (!isActive && !blockSet.requireActive && !blockSet.annoyMode) {
					blockIfNeeded(tabId, blockSet)
				}

				else if (isActive && !blockSet.requireActive && !blockSet.annoyMode) {
					blockIfNeeded(tabId, blockSet)
				}
			}
		}
	}
}