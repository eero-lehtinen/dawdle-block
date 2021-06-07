import { browser } from "webextension-polyfill-ts"

const blockSetIdsSaveKey = "blocksetIds"
//const blockSetTimesElapsedSaveKey = "blocksetTimesElapsed"

export class BlockSetManager {

	blockSetIds: number[] = [];
	blockSetTimesElapsed: (number | undefined)[] = [];
	blockSets: (number | undefined)[] = [];

	static async create() : Promise<BlockSetManager> {
		const blockSetManager = new BlockSetManager()
		await blockSetManager.loadBlockSets()
		return blockSetManager
	}

	private constructor() {}

	private async loadBlockSets() : Promise<void> {
		const results = await browser.storage.sync.get({ [blockSetIdsSaveKey]: [0] })
		console.log(results)
	}

	getBlocksetIds(): number[] {
		return this.blockSetIds
	}

	getBlocksetTimesElapsed(): (number | undefined)[] {
		return this.blockSetTimesElapsed
	}

	getBlocksets(): (number | undefined)[] {
		return this.blockSets
	}
}