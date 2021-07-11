import { BlockSet, BlockTestRes } from "./blockSet"
import { timeToMSSinceMidnight } from "../shared/utils"
import { BlockSetStorage } from "./blockSetStorage"

/**
 * Loads blocksets from storage, maintains synchronization when modified. 
 * Has helper function for testing an url against all block sets simultaneously.
 */
export class BlockSets {

	private _blockSets: BlockSet[] = []
	private blockSetStorage: BlockSetStorage

	get blockSets(): BlockSet[] {
		return this._blockSets
	}

	private constructor() {
		this.blockSetStorage = new BlockSetStorage({ preferSync: true })
	}

	/**
	 * Creates and initializes a BlockSetManager.
	 * Loads setting from sync storage.
	 * @returns new instance of BlockSetManager
	 */
	static async create(): Promise<BlockSets> {
		const instance = new BlockSets()
		instance._blockSets = await instance.blockSetStorage.loadBlockSets()
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