/**
 * @file Contains BlockSetManager class for loading, updating and saving block sets.
 */

import { browser } from "webextension-polyfill-ts"
import { BlockSet, BlockTestRes } from "./blockSet"
import { BlockSetIds, plainToBlockSetIds, plainToBlockSetTimesElapsed } from "./blockSetParser"
import { decompress } from "./compression"
import { timeToMSSinceMidnight } from "./timeUtils"

export const bsIdsSaveKey = "blocksetIds"
export const bsTimesElapsedSaveKey = "blocksetTimesElapsed"

export class BlockSetManager {

	private blockSetIds: BlockSetIds = []
	private blockSetTimesElapsed: (number | undefined)[] = []
	private blockSets: (BlockSet | undefined)[] = []

	private constructor() {}

	/**
	 * Creates and initializes a BlockSetManager.
	 * Loads setting from sync storage.
	 * @returns new instance of BlockSetManager
	 */
	static async create(): Promise<BlockSetManager> {
		const bsManager = new BlockSetManager()
		await bsManager.loadAll()
		return bsManager
	}

	private async loadAll(): Promise<void> {
		await this.loadIds()
		await this.loadElapsedTimes()
		await this.loadBlockSets()
	}

	/**
	 * Loads block set ids from sync storage.
	 */
	private async loadIds(): Promise<void> {
		const idRes = await browser.storage.sync.get({ [bsIdsSaveKey]: [0] })
		this.blockSetIds = plainToBlockSetIds(idRes[bsIdsSaveKey])
	}

	/**
	 * Loads elapsed times for block sets from sync storage.
	 */
	private async loadElapsedTimes(): Promise<void> {
		const elapsedTimeRes = await browser.storage.sync.get(
			{ [bsTimesElapsedSaveKey]: [0] })
		this.blockSetTimesElapsed = plainToBlockSetTimesElapsed(elapsedTimeRes[bsTimesElapsedSaveKey])
	}

	/**
	 * Loads all block sets from sync storage based on this.blockSetIds.
	 * loadIds() must be called before this!
	 */
	private async loadBlockSets(): Promise<void> {
		const blockSetQuery: { [s: string]: undefined } = {}
		for (const id of this.blockSetIds) {
			blockSetQuery[id] = undefined
		}
		const blockSetRes = await browser.storage.sync.get(blockSetQuery)

		for(const id of this.blockSetIds) {
			if (typeof blockSetRes[id] === "string") {
				this.blockSets[id] = new BlockSet(decompress(blockSetRes[id]))
			}
			else {
				this.blockSets[id] = new BlockSet(blockSetRes[id])
			}
		}
	}

	getBSIds(): number[] {
		return this.blockSetIds
	}

	getBSTimesElapsed(): (number | undefined)[] {
		return this.blockSetTimesElapsed
	}

	getBlockSets(): (BlockSet | undefined)[] {
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
		for (const id of this.blockSetIds) {
			const blockSet = this.blockSets[id]
			if (!blockSet) {
				throw new Error("BlockSets and BlockSetIds not in sync!!")
			}

			// if today is not an active day or not in active hours
			if (!blockSet.isInActiveWeekday(weekDay) || !blockSet.isInActiveTime(msSinceMidnight)) 
				continue

			const blockResult = blockSet.test(url, undefined, undefined)

			if (blockResult === BlockTestRes.Blacklisted) {
				blockingBSIds.push(id)
			}
		}
		return blockingBSIds
	}
}