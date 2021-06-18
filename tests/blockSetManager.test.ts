import type { Browser } from "webextension-polyfill-ts"
import { deepMock } from "mockzilla"

const [browser, mockBrowser, mockBrowserNode] = deepMock<Browser>("browser", false)

jest.mock("webextension-polyfill-ts", () => ({ browser }))

import { BlockSetManager, bsIdsSaveKey, bsTimesElapsedSaveKey } from "../src/scripts/background/blockSetManager"
import { BlockSet } from "../src/scripts/background/blockSet"
import { BlockSetIds, BlockSetTimesElapsed } from "../src/scripts/background/blockSetParser"
import { compress } from "../src/scripts/background/utils"


const setUpMockStorage = ({ idReturn, elapsedReturn }: 
		{idReturn: BlockSetIds, elapsedReturn: BlockSetTimesElapsed}) => {

	mockBrowser.storage.sync.get.expect({ [bsIdsSaveKey]: [0] })
		.andResolve({ [bsIdsSaveKey]: idReturn })
	mockBrowser.storage.sync.get.expect({ [bsTimesElapsedSaveKey]: [0] })
		.andResolve({ [bsTimesElapsedSaveKey]: elapsedReturn })
}

describe("test BlockSetManager with browser api mocking", () => {
	beforeEach(() => mockBrowserNode.enable())
	afterEach(() => mockBrowserNode.verifyAndDisable())

	it("can load block set ids, blocksets, and elapsed times from sync storage", async() => {
		setUpMockStorage({ idReturn: [0], elapsedReturn: [0] })
		mockBrowser.storage.sync.get.expect({ "0": undefined })
			.andResolve({ "0": undefined })

		const bsManager = await BlockSetManager.create()
		expect(bsManager.getBSIds()).toStrictEqual([0])
		expect(bsManager.getBSTimesElapsed()).toStrictEqual([0])
		expect(bsManager.getBlockSets()).toMatchObject([new BlockSet()])
	})

	it("can load compressed blocksets from sync storage", async() => {
		setUpMockStorage({ idReturn: [0], elapsedReturn: [0] })
		mockBrowser.storage.sync.get.expect({ "0": undefined })
			.andResolve({ "0": compress({}) })

		const bsManager = await BlockSetManager.create()
		expect(bsManager.getBlockSets()).toMatchObject([new BlockSet()])
	})

	it("can handle non continous ids", async() => {
		setUpMockStorage({ idReturn: [3, 2], elapsedReturn: [undefined, undefined, 0, 0] })
		mockBrowser.storage.sync.get.expect({ 3: undefined, 2: undefined })
			.andResolve({ 3: undefined, 2: undefined })

		const bsManager = await BlockSetManager.create()
		expect(bsManager.getBSIds()).toStrictEqual([3, 2])
		expect(bsManager.getBSTimesElapsed()).toMatchObject([undefined, undefined, 0, 0])
		expect(bsManager.getBlockSets()).toMatchObject([undefined, undefined, new BlockSet(), new BlockSet()])
	})
})


describe("test BlockSetManager url checking", () => {
	beforeEach(() => mockBrowserNode.enable())
	afterEach(() => mockBrowserNode.verifyAndDisable())
	it.todo("")
})
