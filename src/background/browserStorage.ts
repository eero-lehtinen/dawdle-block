import { err, errAsync, okAsync, Result, ResultAsync } from "neverthrow"
import { browser, Storage } from "webextension-polyfill-ts"
import { ZodIssue } from "zod"
import { BlockSet } from "./blockSet"
import { 
	plainToBlockSetIds, plainToBlockSetTimesElapsed, 
	BlockSetIds, BlockSetTimesElapsed, BlockSetData, 
}	from "./blockSetParser"
import { decompress, compress, DecompressError } from "./compression"
import { 
	createDefaultGeneralOptionsData, GeneralOptionsData, plainToGeneralOptionsData, 
} from "./generalOptionsParser"
import { ParseError, ZodResAsync } from "./parserHelpers"

interface BrowserStorageOptions {
	preferSync: boolean
}

export enum StorageSetError {
	TooManyWrites = "TooManyWrites",
	TooLarge = "TooLarge",
}

type StorageSetErrorUnknown = { message: string }

export type StorageSetAnyError = StorageSetError | StorageSetErrorUnknown

export const bsIdsSaveKey = "blocksetIds"
export const bsTimesElapsedSaveKey = "blocksetTimesElapsed"
export const generalOptionsSaveKey = "generalOptions"

/**
 * Object for saving and loading block sets from browser storage. 
 * Can be configured to be local or cloud synced.
 * NOTE!!: 
 * There is no way to detect if cloud sync has beed disabled by the browser.
 * In that case storage will silently be local.
 */
export class BrowserStorage {

	private storage: Storage.StorageArea
	private readonly QUOTA_BYTES_PER_ITEM = browser.storage.sync.QUOTA_BYTES_PER_ITEM
	
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

	/** Fetches and validates general options data from storage.*/
	fetchGeneralOptionsData(): ZodResAsync<GeneralOptionsData, ParseError> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return ResultAsync.fromSafePromise<any, ZodIssue[] | ParseError>(
			this.storage.get({ [generalOptionsSaveKey]: null }))
			.andThen<GeneralOptionsData, ZodIssue[] | ParseError>(
				res => res[generalOptionsSaveKey] === null ?
					okAsync(createDefaultGeneralOptionsData()) :
					plainToGeneralOptionsData(res[generalOptionsSaveKey]))
	}

	/**
	 * Saves general options to storage.
	 */
	saveGeneralOptionsData(data: GeneralOptionsData): ResultAsync<void, StorageSetAnyError> {
		return this.storageSet({ [generalOptionsSaveKey]: data })
	}

	/**
	 * Fetches and validates all block sets from storage
	 * Returns list of results, which may be block sets or their errors.
	 * Eg. if second block set parsing failed, result may be 
	 * [ok(BlockSet), err(ParseErr), ok(BlockSet), ...].
	 * If ids or elapsedTimes fetching fails, their errors will be in the first element.
	 */
	async fetchBlockSets(): Promise<Result<BlockSet,
		ZodIssue[] | ParseError | DecompressError>[]> {
	
		const idsGet = await this.storage.get({ [bsIdsSaveKey]: [] })
		const idsRes = plainToBlockSetIds(idsGet[bsIdsSaveKey])
		if (idsRes.isErr()) return [err(idsRes.error)]
		
		const blockSetIds = idsRes.value
		if (blockSetIds.length === 0) {
			return []
		}

		const timesElapsedGet = await this.storage.get({ [bsTimesElapsedSaveKey]: [] })
		const timesElapsedRes = plainToBlockSetTimesElapsed(timesElapsedGet[bsTimesElapsedSaveKey])
		if (timesElapsedRes.isErr()) return [err(timesElapsedRes.error)]

		const timesElapsed = timesElapsedRes.value

		const blockSetQuery: Record<string, null> = {}
		for (const id of blockSetIds) {
			blockSetQuery[id] = null
		}
		const blockSetGetResults = await this.storage.get(blockSetQuery)

		const results: Result<BlockSet, ZodIssue[] | ParseError | DecompressError>[] = []

		for(const id of blockSetIds) {
			if (typeof blockSetGetResults[id] === "string") {
				results.push(decompress(blockSetGetResults[id])
					.andThen(blockSetPlainObj => BlockSet.create(id, blockSetPlainObj, timesElapsed[id])))
			}
			else {
				results.push(BlockSet.create(id, blockSetGetResults[id], timesElapsed[id]))
			}
			
		}
		return results
	}

	/**
	 * Saves new block set to the *END* of the block set list.
	 * @param blockSet block set to save
	 * @param blockSetList ordered list of all block sets with this new block set id added
	 */
	saveNewBlockSet(blockSet: BlockSet, blockSetList: BlockSet[]): 
		ResultAsync<void, StorageSetAnyError> {
		const [bsIds, timesElapsed] = this.generateIdsAndTimesElapsed(blockSetList)
		return this.storageSet({
			[bsIdsSaveKey]: bsIds,
			[bsTimesElapsedSaveKey]: timesElapsed,
			[blockSet.id]: blockSet.data,
		})
	}

	/** Saves a new version of a block set that has already been saved.*/
	saveBlockSet(blockSet: BlockSet): ResultAsync<void, StorageSetAnyError> {
		return this.storageSet({ [blockSet.id]: blockSet.data })
	}

	/**
	 * Saves a new version of a block set that has already been saved.
	 * @param blockSet block set to delete
	 * @param blockSetList ordered list of all block sets with this block set id removed
	 */
	deleteBlockSet(blockSet: BlockSet, blockSetList: BlockSet[]): 
		ResultAsync<void, StorageSetAnyError> {
		const [bsIds, timesElapsed] = this.generateIdsAndTimesElapsed(blockSetList)
		return this.storageSet({ 
			[bsIdsSaveKey]: bsIds,
			[bsTimesElapsedSaveKey]: timesElapsed,
			[blockSet.id]: null,
		})
	}

	/** Generate saveable list of ids and elapsed times from raw list of block sets. */
	private generateIdsAndTimesElapsed(blockSetList: BlockSet[]): 
		[BlockSetIds, BlockSetTimesElapsed] {
		const bsIds: BlockSetIds = []
		const timesElapsed: BlockSetTimesElapsed = []
		for (const blockSet of blockSetList) {
			bsIds.push(blockSet.id)
			timesElapsed[blockSet.id] = blockSet.timeElapsed
		}
		return [bsIds, timesElapsed]
	}

	/**
	 * Saves items to browser storage with enhanced error messages.
	 * If item is BlockSetData, apply compression.
	 */
	private storageSet(
		items: Record<string, 
			null | string | BlockSetData | BlockSetIds | BlockSetTimesElapsed | GeneralOptionsData>): 
			ResultAsync<void, StorageSetAnyError> {
		
		for (const key in items) {
			// if key is number, then item is block set data -> we can compress it
			if (!isNaN(parseInt(key, 10)) && items[key] !== null) {
				const compressed = compress(items[key])
				if (compressed.length + 20 > this.QUOTA_BYTES_PER_ITEM) {
					return errAsync(StorageSetError.TooLarge)
				}
				items[key] = compressed
			}
		}

		return ResultAsync.fromPromise(this.storage.set(items), err => {
			if ((err as { message: string }).message.includes("WRITE_OPERATIONS"))
				return StorageSetError.TooManyWrites
				
			console.warn("Can't save item: ", err)
			return { message: (err as { message: string }).message }
		})
	}
}