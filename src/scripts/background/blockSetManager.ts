/**
 * @file Contains BlockSetManager class for loading, updating and saving block sets.
 */

import { browser } from "webextension-polyfill-ts"
import { BlockSet, BlockTestRes } from "./blockSet"
import { plainToBlockSetIds, plainToBlockSetTimesElapsed } from "./blockSetParser"
import { decompress } from "./compression"
import { timeToMSSinceMidnight } from "./timeUtils"

export const bsIdsSaveKey = "blocksetIds"
export const bsTimesElapsedSaveKey = "blocksetTimesElapsed"

export class BlockSetManager {

	private blockSets: BlockSet[] = []

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
		const idRes = await browser.storage.sync.get({ [bsIdsSaveKey]: [0] })
		return plainToBlockSetIds(idRes[bsIdsSaveKey])
	}

	/**
	 * Loads all block sets from sync storage based on blockSetIds.
	 */
	private async loadBlockSets(blockSetIds: number[]): Promise<void> {
		const elapsedTimeRes = await browser.storage.sync.get(
			{ [bsTimesElapsedSaveKey]: [0] })
		const timesElapsed = plainToBlockSetTimesElapsed(elapsedTimeRes[bsTimesElapsedSaveKey])

		const blockSetQuery: { [s: string]: undefined } = {}
		for (const id of blockSetIds) {
			blockSetQuery[id] = undefined
		}
		const blockSetRes = await browser.storage.sync.get(blockSetQuery)

		for(const id of blockSetIds) {
			if (typeof blockSetRes[id] === "string") {
				blockSetRes[id] = decompress(blockSetRes[id])
			}
			this.blockSets.push(new BlockSet(id, blockSetRes[id], timesElapsed[id]))	
		}
	}

	getBlockSets(): BlockSet[] {
		return this.blockSets
	}

	/**
	 * Return a list of block set ids that want to block this url.
	 * @param url url to check against
	 */
	async blockedBy(url: string): Promise<number[]> {
		const blockingBSIds: number[] = []

		const now = new Date()
		const msSinceMidnight = timeToMSSinceMidnight(now)
		const weekDay = now.getDay()
		for (const blockSet of this.blockSets) {
			// if today is not an active day or not in active hours
			if (!blockSet.isInActiveWeekday(weekDay) || !blockSet.isInActiveTime(msSinceMidnight)) 
				continue

			const blockResult = blockSet.test(url, null, null)

			if (blockResult === BlockTestRes.Blacklisted) {
				blockingBSIds.push(blockSet.getId())
			}
		}
		return blockingBSIds
	}
}