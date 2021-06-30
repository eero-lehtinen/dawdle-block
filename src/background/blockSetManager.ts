import { browser } from "webextension-polyfill-ts"
import { BlockSet, BlockTestRes } from "./blockSet"
import { plainToBlockSetIds, plainToBlockSetTimesElapsed } from "./blockSetParser"
import { decompress } from "./compression"
import { timeToMSSinceMidnight } from "./timeUtils"

export const bsIdsSaveKey = "blocksetIds"
export const bsTimesElapsedSaveKey = "blocksetTimesElapsed"

/**
 * Loads blocksets from sync storage, maintains synchronization when modified. 
 * Has helper function for testing an url against all block sets simultaneously.
 */
export class BlockSetManager {

	private _blockSets: BlockSet[] = []

	get blockSets(): BlockSet[] {
		return this._blockSets
	}

	private constructor() {}

	/**
	 * Creates and initializes a BlockSetManager.
	 * Loads setting from sync storage.
	 * @returns new instance of BlockSetManager
	 */
	static async create(): Promise<BlockSetManager> {
		const bsManager = new BlockSetManager()
		await bsManager.loadBlockSets(await bsManager.fetchIds())
		return bsManager
	}

	/**
	 * Fetches block set ids from sync storage.
	 */
	private async fetchIds(): Promise<number[]> {
		const idRes = await browser.storage.sync.get({ [bsIdsSaveKey]: [] })
		return plainToBlockSetIds(idRes[bsIdsSaveKey])
	}

	/**
	 * Loads all block sets from sync storage based on blockSetIds.
	 * @param blockSetIds
	 */
	private async loadBlockSets(blockSetIds: number[]): Promise<void> {
		const elapsedTimeRes = await browser.storage.sync.get(
			{ [bsTimesElapsedSaveKey]: [] })
		const timesElapsed = plainToBlockSetTimesElapsed(elapsedTimeRes[bsTimesElapsedSaveKey])

		const blockSetQuery: { [s: string]: unknown } = {}
		for (const id of blockSetIds) {
			blockSetQuery[id] = null
		}
		const blockSetRes = await browser.storage.sync.get(blockSetQuery)

		for(const id of blockSetIds) {
			try {
				if (typeof blockSetRes[id] === "string") {
					blockSetRes[id] = decompress(blockSetRes[id])
				}
				this._blockSets.push(new BlockSet(id, blockSetRes[id], timesElapsed[id]))
			}
			catch (err) {
				console.error("Couldn't parse blockset with id " + id)
				console.error(err)
			}
		}
	}

	/**
	 * Return a list of block set ids that want to block this url.
	 * @param urlNoProtocol url to check against (no protocol allowed)
	 * @param channelId channel id to check against
	 * @param categoryId category id to check against
	 */
	blockedBy(urlNoProtocol: string, channelId: string | null, categoryId: string | null): number[] {
		const blockingBSIds: number[] = []

		const now = new Date()
		const msSinceMidnight = timeToMSSinceMidnight(now)
		const weekDay = now.getDay()
		for (const blockSet of this._blockSets) {
			// if today is not an active day or not in active hours
			if (!blockSet.isInActiveWeekday(weekDay) || !blockSet.isInActiveTime(msSinceMidnight)) 
				continue

			const blockResult = blockSet.test(urlNoProtocol, channelId, categoryId)

			if (blockResult === BlockTestRes.Blacklisted) {
				blockingBSIds.push(blockSet.id)
			}
		}
		return blockingBSIds
	}
}