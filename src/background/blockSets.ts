import { BlockSet, BlockTestRes } from "./blockSet"
import { timeToMSSinceMidnight } from "../shared/utils"
import { BrowserStorage, StorageSetError } from "./browserStorage"
import { ResultAsync } from "neverthrow"
import { ParseError, ZodResAsync } from "./parserHelpers"

/**
 * Loads blocksets from storage, maintains synchronization when modified. 
 * Has helper function for testing an url against all block sets simultaneously.
 */
export class BlockSets {

	private _list: BlockSet[] = []
	private _map = new Map<number, BlockSet>()
	private browserStorage: BrowserStorage

	/** Assigns browser storage */
	private constructor(browserStorage: BrowserStorage) {
		this.browserStorage = browserStorage
	}

	/**
	 * Creates and initializes a BlockSets.
	 * Loads all block sets from browser storage.
	 * @param browserStorage
	 * @returns new instance of BlockSets
	 */
	static async create(browserStorage: BrowserStorage): Promise<BlockSets> {
		const instance = new BlockSets(browserStorage)
		const results = await instance.browserStorage.fetchBlockSets()
		results.forEach(result => result.match(
			bs => { instance.addBlockSet(bs) },
			err => { console.warn("Block Set couldn't be loaded", err) },
		))
		
		// Create a single default block set if storage is empty
		if (results.length === 0)
			// Has miniscule chance of erroring and not adding.
			// Change is low enough and it doesn't break anything irreversibly,
			// so I choose not to care.
			await instance.addDefaultBlockSet()
		return instance
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
		for (const blockSet of this._list) {
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

	get list(): BlockSet[] {
		return this._list
	}

	get map(): Map<number, BlockSet> {
		return this._map
	}

	/** Returns list of block set ids in the order they should appear in UI */
	getIds(): number[] {
		return this._list.map((bs) => bs.id)
	}

	/**
	 * Add a new block set to the end of the list with default values.
	 * Id will be automatically assigned.
	 */
	addDefaultBlockSet(): ResultAsync<BlockSet, StorageSetError> {
		const newBlockSet = BlockSet.createDefault(this.findNextSafeId())
		newBlockSet.name = this.computeNewName()

		return this.browserStorage.saveNewBlockSet(newBlockSet, [...this._list, newBlockSet])
			.map(() => {
				this.addBlockSet(newBlockSet)
				return newBlockSet
			})
	}

	/**
	 * Add a new block set to the end of the list with values copied from `copyFrom`.
	 * timeElapsed will be set to zero and id will be automatically assigned.
	 * (copy) will be appended to the end of the name.
	 */
	addBlockSetCopy(copyFrom: BlockSet): 
		ZodResAsync<BlockSet, ParseError | StorageSetError> {
		return BlockSet.create(this.findNextSafeId(), copyFrom.data)
			.map(bs => this.insertCopyName(bs))
			.asyncAndThen(bs => 
				this.browserStorage.saveNewBlockSet(bs, [...this._list, bs]).map(() => bs))
			.map(bs => this.addBlockSet(bs))
	}

	/** Adds block set to internal list and map. */
	private addBlockSet(blockSet: BlockSet): BlockSet {
		this._list.push(blockSet)
		this._map.set(blockSet.id, blockSet)
		return blockSet
	}

	/** Returns the smallest block set id that is >= 0 and unused. */
	private findNextSafeId() {
		const currentIds = this.getIds()
		let nextSafeId = 0
		while(currentIds.indexOf(nextSafeId) > -1) {
			nextSafeId += 1
		}
		return nextSafeId
	}

	/**
	 * Appends "(copy)" to end of block set name.
	 * If there already exists a block set with name ending in "(copy)", 
	 * then replace it with "(copy2x)", then "(copy3x)".
	 * Continues in this fashion for further copies. 
	 */
	private insertCopyName(blockSet: BlockSet): BlockSet {
		const regexRes = /\(copy(?:(\d{1,})x)?\)$/.exec(blockSet.name)
		if (regexRes === null) {
			blockSet.name = `${ blockSet.name } (copy)`
			return blockSet
		}
		
		const copyNumberStr = regexRes[1]
		const copyIndex = regexRes.index
		const copyNumber = copyNumberStr !== undefined ? parseInt(copyNumberStr, 10) : 1

		blockSet.name = `${blockSet.name.substring(0, copyIndex)}(copy${copyNumber + 1}x)`
		return blockSet
	}

	
	/**
	 * Returns "Block Set ${number larger than any that already exist}", starting from 1
	 * E.g. if there exists block set with name "Block Set 7", 
	 * and no larger numbers exist, then this will return "Block Set 8".
	 * In that case 1 will not be chosen, even if it is technically "free".
	 */
	private computeNewName(): string {
		let largestNumber = 0
		for (const blockSet of this._list) {
			const regexRes = /^Block Set (\d{1,})$/.exec(blockSet.name)
			if (regexRes !== null) {
				const number = parseInt(regexRes[1] as string, 10)
				largestNumber = Math.max(largestNumber, number)
			}
		}

		return `Block Set ${largestNumber + 1}`
	}

	/**
	 * Deletes block set referenced by blockSet
	 * @param blockSet reference to value to be deleted
	 */
	deleteBlockSet(blockSet: BlockSet): ResultAsync<void, StorageSetError> {
		const newList = this._list.filter(bs => bs !== blockSet)
		return this.browserStorage
			.deleteBlockSet(blockSet, newList)
			.map(() => {
				this._map.delete(blockSet.id)
				this._list = newList
			})
	}
}