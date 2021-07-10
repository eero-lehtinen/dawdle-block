import type { Browser } from "webextension-polyfill-ts"
import { deepMock } from "mockzilla"

const [browser, mockBrowser, mockBrowserNode] = deepMock<Browser>("browser", false)

jest.doMock("webextension-polyfill-ts", () => ({ browser }))

import { BlockSets, bsIdsSaveKey, bsTimesElapsedSaveKey } 
	from "../src/background/blockSets"
import { BlockSet } from "../src/background/blockSet"
import { BlockSetIds, BlockSetTimesElapsed } from "../src/background/blockSetParser"
import { compress } from "../src/background/compression"


/**
 * Sets up expectations and resolves for browser sync storage.
 * Expections should be the same every time. Resolves can be chosen.
 * @param param0 values to resolve
 */
const setUpMockStorage = ({ idResolve, elapsedResolve }: 
		{idResolve: BlockSetIds, elapsedResolve: BlockSetTimesElapsed}) => {

	mockBrowser.storage.sync.get.expect({ [bsIdsSaveKey]: [] })
		.andResolve({ [bsIdsSaveKey]: idResolve })
	mockBrowser.storage.sync.get.expect({ [bsTimesElapsedSaveKey]: [] })
		.andResolve({ [bsTimesElapsedSaveKey]: elapsedResolve })
}

describe("test BlockSets with browser api mocking", () => {
	beforeEach(() => mockBrowserNode.enable())
	afterEach(() => mockBrowserNode.verifyAndDisable())

	it("can load block set ids, blocksets, and elapsed times from sync storage", async() => {
		setUpMockStorage({ idResolve: [0], elapsedResolve: [0] })
		mockBrowser.storage.sync.get.expect({ "0": null })
			.andResolve({ "0": {} })

		const blockSets = await BlockSets.create()
		expect(blockSets.blockSets).toMatchObject([new BlockSet(0)])
	})

	it.todo("creates a default block set when storage is empty")

	it("can load compressed blocksets from sync storage", async() => {
		setUpMockStorage({ idResolve: [0], elapsedResolve: [0] })
		mockBrowser.storage.sync.get.expect({ "0": null })
			.andResolve({ "0": compress({}) })

		const blockSets = await BlockSets.create()
		expect(blockSets.blockSets).toMatchObject([new BlockSet(0)])
	})

	it("can handle non continuous ids", async() => {
		setUpMockStorage({ idResolve: [3, 2], elapsedResolve: [undefined, undefined, 0, 50] })
		mockBrowser.storage.sync.get.expect({ 3: null, 2: null })
			.andResolve({ 3: {}, 2: {} })

		const blockSets = await BlockSets.create()
		expect(blockSets.blockSets).toMatchObject(
			[new BlockSet(3, {}, 50), new BlockSet(2)])
	})

	it("ignores invalid saves", async() => {
		jest.spyOn(console, "error").mockImplementation(() => {/*do nothing*/})
		setUpMockStorage({ idResolve: [0, 1, 2], elapsedResolve: [0, 0, 0] })
		mockBrowser.storage.sync.get.expect({ 0: null, 1: null, 2: null })
			.andResolve({ 0: "asd", 1: [], 2: 42 }) // "asd" is an invalid compressed value

		const blockSets = await BlockSets.create()
		expect(blockSets.blockSets).toStrictEqual([])
	})
})


describe("test BlockSets url checking", () => {
	beforeEach(() => mockBrowserNode.enable())
	afterEach(() => mockBrowserNode.verifyAndDisable())
	it.todo("returns ids of each matching block sets")
})
