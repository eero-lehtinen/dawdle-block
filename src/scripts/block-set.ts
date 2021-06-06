import { BlockSetData, plainToBlockSetData, createDefaultBlockSet } from "./block-set-parsing"

export class BlockSet {
	private data: BlockSetData

	/**
	 * Parses blocksetPlanObject and initializes internal state to match that.
	 * @throws {Error} if object is not parseable
	 * @param blocksetPlanObject 
	 */
	constructor(blocksetPlanObject?: unknown) {
		if (blocksetPlanObject === undefined)
			this.data = createDefaultBlockSet()
		else 
			this.data = plainToBlockSetData(blocksetPlanObject)
	}

	/**
	 * Returns current state of block set as a plain js object for saving purposes.
	 * @returns plain js object
	 */
	getData(): unknown {
		return this.data
	}
}