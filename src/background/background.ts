import { BlockSet, BSState } from "./blockSet"
import { BlockSets } from "./blockSets"
import { BrowserStorage } from "./browserStorage"
import { TabLoadedEvent, TabObserver, TabRemovedEvent } from "./tabObserver"
import { getYTInfo, nullYTInfo, YTInfo } from "./youtubeAPI"
import { blockTab, isBlockPage } from "./blockTab"
import { annoyTab } from "./annoyTab"
import { setBadge } from "./setBadge"
import ms from "ms.macro"

export const updateInterval = ms`1s`

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

	/**
	 * Increments timeElapsed for block sets.
	 * Replaces tabs with block pages when block set time is depleted.
	 * Applies annoy banners to tabs when block sets are on overtime.
	 */
	private update() {
		const activeTabIds = this.tabObserver.getActiveTabIds()

		const incrementedBlockSetIds = new Set<number>()
		const incrementTimeElapsed = (blockSet: BlockSet) => {
			if (!incrementedBlockSetIds.has(blockSet.id)) {
				blockSet.timeElapsed += updateInterval
				incrementedBlockSetIds.add(blockSet.id)
			}
		}

		let smallestTimeLeft = Infinity
		let globalBiggestOvertime = 0
		// key = tabId, value = overtime
		const tabBiggestOvertimes = new Map<number, number>()
		const collectTabBiggestOvertime = (overtime: number, tabId: number) => {
			if ((tabBiggestOvertimes.get(tabId) ?? 0) < overtime)
				tabBiggestOvertimes.set(tabId, overtime)
		}

		for (const [tabId, tabInfo] of this.tabInfoCache) {
			const isActive = activeTabIds.includes(tabId)
			let blocked = false

			for (const blockSetId of tabInfo.blockedBy) {
				const blockSet = this._blockSets.map.get(blockSetId)
				if (blockSet === undefined) continue

				// If block set requires activity and tab is not active, it can be skipped
				if (!isActive && blockSet.requireActive) continue

				if (blockSet.isInState(BSState.TimeLeft, BSState.OverTime)) {
					incrementTimeElapsed(blockSet)
					smallestTimeLeft = Math.min(smallestTimeLeft, blockSet.timeAllowed - blockSet.timeElapsed)
				}

				if (blockSet.isInState(BSState.OverTime)) {
					// When requireActive == true, annoy is only for this tab
					if (blockSet.requireActive)
						collectTabBiggestOvertime(blockSet.overtime, tabId)

					// When requireActive == false, annoy is global
					else
						globalBiggestOvertime = 
							Math.max(globalBiggestOvertime, this._blockSets.map.get(blockSetId)?.overtime ?? -1)
				}
				else if (blockSet.isInState(BSState.Block) && !blocked) {
					blockTab(tabId)
					blocked = true
				}
			}
		}
		
		for (const tabId of this.tabInfoCache.keys()) {
			const tabBiggestOvertime = 
				Math.max(globalBiggestOvertime, tabBiggestOvertimes.get(tabId) ?? 0)
			if (tabBiggestOvertime > 0) {
				annoyTab(tabId, tabBiggestOvertime)
			}
		}

		void setBadge(smallestTimeLeft)
	}
}