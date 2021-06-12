/**
 * @file Contains BlockSetManager class for loading, updating and saving block sets.
 */

import { browser } from "webextension-polyfill-ts"
import { BlockSet } from "./blockSet"
import { BlockSetIds, plainToBlockSetIds, plainToBlockSetTimesElapsed } from "./blockSetParser"

export const bsIdsSaveKey = "blocksetIds"
export const bsTimesElapsedSaveKey = "blocksetTimesElapsed"

export class BlockSetManager {

	private blockSetIds: BlockSetIds = [];
	private blockSetTimesElapsed: (number | undefined)[] = [];
	private blockSets: (BlockSet | undefined)[] = [];

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
			this.blockSets[id] = new BlockSet(blockSetRes[id])
		}
	}

	getBSIds(): number[] {
		return this.blockSetIds
	}

	getBSTimesElapsed(): (number | undefined)[] {
		return this.blockSetTimesElapsed
	}

	getBSs(): (BlockSet | undefined)[] {
		return this.blockSets
	}
}