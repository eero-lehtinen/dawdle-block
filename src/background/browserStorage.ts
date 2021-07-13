import { browser, Storage } from "webextension-polyfill-ts"
import { BlockSet } from "./blockSet"
import { 
	plainToBlockSetIds, plainToBlockSetTimesElapsed, 
	BlockSetIds, BlockSetTimesElapsed, BlockSetData } 
	from "./blockSetParser"
import { decompress, compress } from "./compression"

interface BrowserStorageOptions {
	preferSync: boolean
}

export const bsIdsSaveKey = "blocksetIds"
export const bsTimesElapsedSaveKey = "blocksetTimesElapsed"

/**
 * Object for saving and loading block sets from browser storage. 
 * Can be configured to be local or cloud synced.
 * NOTE!!: 
 * There is no way to detect if cloud sync has beed disabled by the browser.
 * In that case storage will silently be local.
 */
export class BrowserStorage {

	private storage: Storage.StorageArea
	private readonly maxItemSize = browser.storage.sync.QUOTA_BYTES_PER_ITEM
	
	/**
	 * Instantiates block set storage.
	 * @param opts Configuration options
	 * @param opts.preferSync If true, try to use sync storage.
	 * Sync may not be available, e.g. in Opera or if sync has beed disabled in browser settings.
	 * There is no way to detect if sync has beed disabled by the browser.
	 * If false, always use local storage.
	 */
	constructor(opts: BrowserStorageOptions) {
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
				console.error(`Couldn't parse blockset with id ${id}`)
				console.error(err)
			}
		}
		return results
	}

	/**
	 * Saves new block set to the *END* of the block set list.
	 * @param blockSet block set to save
	 * @param blockSetIds ordered list of block set ids with this new block set id added
	 * @throws "Can't save item, it is too large" when size quota is exceeded
	 * @throws "Can't save item, too many write operations" when write operations quota is exceeded
	 */
	async saveNewBlockSet(blockSet: BlockSet, blockSetIds: BlockSetIds): Promise<void> {
		await	this.storageSet({ 
			[bsIdsSaveKey]: blockSetIds,
			[blockSet.id]: blockSet.data,
		})
	}

	/**
	 * Saves a new version of a block set that has already been saved.
	 * @param blockSet
	 * @throws "Can't save item, it is too large" when size quota is exceeded
	 * @throws "Can't save item, too many write operations" when write operations quota is exceeded
	 */
	async saveBlockSet(blockSet: BlockSet): Promise<void> {
		await	this.storageSet({ [blockSet.id]: blockSet.data })
	}

	/**
	 * Saves items to browser storage with enhanced error messages.
	 * If item is BlockSetData, apply compression.
	 * @param items items to save
	 * @throws "Can't save item, it is too large" when size quota is exceeded
	 * @throws "Can't save item, too many write operations" when write operations quota is exceeded
	 */
	private async storageSet(
		items: Record<string, string | BlockSetData | BlockSetIds | BlockSetTimesElapsed>) {
		
		for (const key in items) {
			if (typeof items[key] === "object") {
				const compressed = compress(items[key])
				if (compressed.length + 20 > this.maxItemSize) {
					throw Error("Can't save item, it is too large")
				}
				items[key] = compressed
			}
		}

		try {
			await	this.storage.set(items)
		}
		catch(err) {
			console.log("Can't save item", err.message)

			if ((err.message as string).includes("WRITE_OPERATIONS")) {
				throw Error("Can't save item, too many write operations")
			}
		}
	}
}