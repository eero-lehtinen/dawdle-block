import type { Browser } from "webextension-polyfill-ts"
import { deepMock } from "mockzilla"
import { randomBytes } from "crypto"

const [browser, mockBrowser, mockBrowserNode] = deepMock<Browser>("browser", false)

jest.doMock("webextension-polyfill-ts", () => ({ browser }))

import { BlockSetStorage, bsIdsSaveKey, bsTimesElapsedSaveKey } 
	from "@src/background/blockSetStorage"
import { BlockSet } from "@src/background/blockSet"
import { BlockSetIds, BlockSetTimesElapsed } from "@src/background/blockSetParser"
import { compress } from "@src/background/compression"

beforeEach(() => {
	mockBrowserNode.enable()
	mockBrowser.storage.sync.QUOTA_BYTES_PER_ITEM.mock(8192)
	jest.spyOn(console, "log").mockImplementation(() => {/*do nothing*/})
})
afterEach(() => mockBrowserNode.verifyAndDisable())

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

describe("test BlockSetStorage with browser api mocking", () => {
	let blockSetStorage: BlockSetStorage
	let testBlockSet: BlockSet

	beforeEach(() => {
		mockBrowser.storage.sync.mockAllow()
		blockSetStorage = new BlockSetStorage({ preferSync: true })
		testBlockSet = new BlockSet(12, { name: "TEST" })
	})

	it("returns empty if storage is empty", async() => {
		mockBrowser.storage.sync.get.expect.andResolve({ [bsIdsSaveKey]: [] })
		expect(await blockSetStorage.loadBlockSets()).toMatchObject([])
	})

	it("can load block set ids, blocksets, and elapsed times from sync storage", async() => {
		setUpMockStorage({ idResolve: [0], elapsedResolve: [0] })
		mockBrowser.storage.sync.get.expect({ 0: null })
			.andResolve({ 0: {} })

		expect(await blockSetStorage.loadBlockSets()).toMatchObject([new BlockSet(0)])
	})

	it("can load compressed blocksets from sync storage", async() => {
		setUpMockStorage({ idResolve: [0], elapsedResolve: [0] })
		mockBrowser.storage.sync.get.expect({ 0: null })
			.andResolve({ 0: compress({}) })

		expect(await blockSetStorage.loadBlockSets()).toMatchObject([new BlockSet(0)])
	})

	it("can handle non continuous ids", async() => {
		setUpMockStorage({ idResolve: [3, 2], elapsedResolve: [undefined, undefined, 0, 50] })
		mockBrowser.storage.sync.get.expect({ 3: null, 2: null })
			.andResolve({ 3: {}, 2: {} })

		expect(await blockSetStorage.loadBlockSets()).toMatchObject(
			[new BlockSet(3, {}, 50), new BlockSet(2)])
	})

	it("ignores invalid saves", async() => {
		jest.spyOn(console, "error").mockImplementation(() => {/*do nothing*/})
		setUpMockStorage({ idResolve: [0, 1, 2], elapsedResolve: [0, 0, 0] })
		mockBrowser.storage.sync.get.expect({ 0: null, 1: null, 2: null })
			.andResolve({ 0: "asd", 1: [], 2: 42 }) 
		// "asd" is an invalid compressed value. [] and 42 are invalid in general

		expect(await blockSetStorage.loadBlockSets()).toStrictEqual([])
	})

	it("can save a new block set", async() => {
		mockBrowser.storage.sync.set.expect(
			{ [bsIdsSaveKey]: [12], 12: compress(testBlockSet.data) }).andResolve()
		await blockSetStorage.saveNewBlockSet(testBlockSet, [12])
	})

	it("can save a new version of old block set", async() => {
		mockBrowser.storage.sync.set.expect({ 12: compress(testBlockSet.data) }).andResolve()
		await blockSetStorage.saveBlockSet(testBlockSet)
	})

	it("saveBlockSet throws when object is too large to be saved", async() => {	
		// 10k random bytes is too large to store even compressed
		testBlockSet.name = randomBytes(10000).toString("hex") 
		await expect(blockSetStorage.saveBlockSet(testBlockSet))
			.rejects.toThrow("Can't save item, it is too large")
	})

	it("saveBlockSet throws when saves are done in too quick succession", async() => {	
		mockBrowser.storage.sync.set.expect({ 12: compress(testBlockSet.data) })
			.andReject(Error("WRITE_OPERATIONS"))
		await expect(blockSetStorage.saveBlockSet(testBlockSet))
			.rejects.toThrow("Can't save item, too many write operations")
	})
})

describe("test BlockSetStorage local storage with browser api mocking", () => {
	it("uses storage.sync.local if preferSync is false", async() => {
		mockBrowser.storage.local.mockAllow()
		const blockSetStorage = new BlockSetStorage({ preferSync: false })

		mockBrowser.storage.local.get.expect({ [bsIdsSaveKey]: [] })
			.andResolve({ [bsIdsSaveKey]: [0] })
		mockBrowser.storage.local.get.expect({ [bsTimesElapsedSaveKey]: [] })
			.andResolve({ [bsTimesElapsedSaveKey]: [0] })
		mockBrowser.storage.local.get.expect({ 0: null })
			.andResolve({ 0: {} })

		expect(await blockSetStorage.loadBlockSets()).toMatchObject([new BlockSet(0)])
	})
})