import { browser, Storage } from "webextension-polyfill-ts"
import { BlockSet } from "./blockSet"
import { plainToBlockSetIds, plainToBlockSetTimesElapsed } from "./blockSetParser"
import { decompress } from "./compression"

interface BlockSetStorageOptions {
	preferSync: boolean
}

export const bsIdsSaveKey = "blocksetIds"
export const bsTimesElapsedSaveKey = "blocksetTimesElapsed"

/**
 * Object for saving and loading block sets from browser storage. 
 * Can be configured to be local or cloud synced.
 * NOTE!!: 
 * There is no way to detect if cloud sync has beed disabled by the browser.
 */
export class BlockSetStorage {

	private storage: Storage.StorageArea
	
	/**
	 * Instantiates block set storage.
	 * @param opts Configuration options
	 * @param opts.preferSync If true, try to use sync storage.
	 * Sync may not be available, e.g. in Opera or if sync has beed disabled in browser settings.
	 * There is no way to detect if sync has beed disabled by the browser.
	 * If false, always use local storage.
	 */
	constructor(opts: BlockSetStorageOptions) {
		this.storage = opts.preferSync ? browser.storage.sync : browser.storage.local
	}

	/**
	 * Fetches block set ids from sync storage.
	 */
	private async fetchIds(): Promise<number[]> {
		const idRes = await this.storage.get({ [bsIdsSaveKey]: [] })
		return plainToBlockSetIds(idRes[bsIdsSaveKey])
	}

	/**
	 * Loads all block sets from storage
	 * @param blockSetIds
	 */
	async loadBlockSets(): Promise<BlockSet[]> {
		const blockSetIds = await this.fetchIds()

		if (blockSetIds.length === 0) {
			return []
		}

		const elapsedTimeRes = await this.storage.get(
			{ [bsTimesElapsedSaveKey]: [] })
		const timesElapsed = plainToBlockSetTimesElapsed(elapsedTimeRes[bsTimesElapsedSaveKey])

		const blockSetQuery: Record<string, null> = {}
		for (const id of blockSetIds) {
			blockSetQuery[id] = null
		}
		const blockSetRes = await this.storage.get(blockSetQuery)

		const results: BlockSet[] = []

		for(const id of blockSetIds) {
			try {
				if (typeof blockSetRes[id] === "string") {
					blockSetRes[id] = decompress(blockSetRes[id])
				}
				results.push(new BlockSet(id, blockSetRes[id], timesElapsed[id]))
			}
			catch (err) {
				console.error("Couldn't parse blockset with id " + id)
				console.error(err)
			}
		}
		return results
	}
}