import { browser } from "webextension-polyfill-ts"
import { randomBytes } from "crypto"
import { BrowserStorage, bsIdsSaveKey, bsTimesElapsedSaveKey } 
	from "@src/background/browserStorage"
import { BlockSet } from "@src/background/blockSet"
import { BlockSetIds, BlockSetTimesElapsed } from "@src/background/blockSetParser"
import { compress } from "@src/background/compression"
import blockSetCmpObj from "../testHelpers/blockSetCmpObj"
import { mocked } from "ts-jest/utils"

jest.mock("webextension-polyfill-ts", () => {
	return {
		browser: {
			storage: { 
				sync: { 
					QUOTA_BYTES_PER_ITEM: 8192,
					get: jest.fn(),
					set: jest.fn(),
				},
				local: { 
					QUOTA_BYTES_PER_ITEM: 8192,
					get: jest.fn(),
					set: jest.fn(),
				},
			},
		},
	}
})

const mockBrowser = mocked(browser, true)

jest.spyOn(console, "log").mockImplementation(() => {/*do nothing*/})

afterEach(() => jest.clearAllMocks())

/**
 * Sets up expectations and resolves for browser sync storage.
 * Expections should be the same every time. Resolves can be chosen.
 * @param param0 values to resolve
 */
const setUpMockStorageResolves = ({ ids, elapsed, blockSets }: 
		{ids: BlockSetIds, 
			elapsed: BlockSetTimesElapsed, 
			blockSets: Record<string, unknown>}) => {
		
	mockBrowser.storage.sync.get
		.mockResolvedValueOnce({ [bsIdsSaveKey]: ids })
		.mockResolvedValueOnce({ [bsTimesElapsedSaveKey]: elapsed })
		.mockResolvedValueOnce(blockSets)
}

/** Ids and elapsed times should always be just empty arrays. */
const expectedGetCalls = (blockSets: Record<string, unknown>) => [
	[{ [bsIdsSaveKey]: [] }],
	[{ [bsTimesElapsedSaveKey]: [] }],
	[blockSets],
]

describe("test BrowserStorage with browser api mocking", () => {
	const browserStorage = new BrowserStorage({ preferSync: true })
	let testBlockSet: BlockSet

	const mockGet = mockBrowser.storage.sync.get
	const mockSet = mockBrowser.storage.sync.set

	beforeEach(() => {
		testBlockSet = new BlockSet(1, { name: "TEST" }, 42)
	})

	afterEach(() => jest.clearAllMocks())

	it("returns empty if storage is empty", async() => {
		mockGet.mockResolvedValue({ [bsIdsSaveKey]: [] })
		expect(await browserStorage.loadBlockSets()).toEqual([])
	})

	it("can load block set ids, blocksets, and elapsed times from sync storage", async() => {
		setUpMockStorageResolves({ ids: [0], elapsed: [0], blockSets: { 0: {} } })

		expect(await browserStorage.loadBlockSets()).toEqual([blockSetCmpObj(new BlockSet(0))])

		expect(mockGet.mock.calls).toEqual(expectedGetCalls({ 0: null }))
	})

	it("can load compressed blocksets from sync storage", async() => {
		setUpMockStorageResolves({ ids: [0], elapsed: [0], blockSets: { 0: compress({}) } })

		expect(await browserStorage.loadBlockSets()).toEqual([blockSetCmpObj(new BlockSet(0))])
		
		expect(mockGet.mock.calls).toEqual(expectedGetCalls({ 0: null }))
	})

	it("can handle non continuous ids", async() => {
		setUpMockStorageResolves({ 
			ids: [3, 2], 
			elapsed: [undefined, undefined, 0, 50], 
			blockSets: { 3: {}, 2: {} }, 
		})

		expect(await browserStorage.loadBlockSets()).toEqual(
			[blockSetCmpObj(new BlockSet(3, {}, 50)), blockSetCmpObj(new BlockSet(2))])

		expect(mockGet.mock.calls).toEqual(expectedGetCalls({ 3: null, 2: null }))
	})

	it("ignores invalid saves", async() => {
		jest.spyOn(console, "error").mockImplementation(() => {/*do nothing*/})

		setUpMockStorageResolves({ 
			ids: [0, 1, 2], 
			elapsed: [0, 0, 0], 
			// "asd" is an invalid compressed value. [] and 42 are invalid in general
			blockSets: { 0: "asd", 1: [], 2: 42 },
		})

		expect(await browserStorage.loadBlockSets()).toStrictEqual([])

		expect(mockGet.mock.calls).toEqual(expectedGetCalls({ 0: null, 1: null, 2: null }))
	})

	it("can save a new block set", async() => {
		await browserStorage.saveNewBlockSet(testBlockSet, [testBlockSet])

		expect(mockSet.mock.calls?.[0]?.[0]).toEqual({
			[bsIdsSaveKey]: [1], 
			[bsTimesElapsedSaveKey]: [undefined, 42], 
			1: compress(testBlockSet.data),
		})
	})

	it("can save a new version of old block set", async() => {
		await browserStorage.saveBlockSet(testBlockSet)

		expect(mockSet.mock.calls?.[0]?.[0]).toEqual({
			1: compress(testBlockSet.data),
		})
	})

	it("saveBlockSet throws when object is too large to be saved", async() => {	
		// 10k random bytes is too large to store even compressed
		testBlockSet.name = randomBytes(10000).toString("hex") 
		await expect(browserStorage.saveBlockSet(testBlockSet))
			.rejects.toThrow("Can't save item, it is too large")
	})

	it("saveBlockSet throws when saves are done in too quick succession", async() => {
		mockSet.mockRejectedValueOnce(Error("WRITE_OPERATIONS"))

		await expect(browserStorage.saveBlockSet(testBlockSet))
			.rejects.toThrow("Can't save item, too many write operations")

		expect(mockSet.mock.calls?.[0]?.[0]).toEqual({
			1: compress(testBlockSet.data),
		})
	})

	it("can delete a block set", async() => {
		await browserStorage.deleteBlockSet(testBlockSet, [])

		expect(mockSet.mock.calls?.[0]?.[0]).toEqual({
			[bsIdsSaveKey]: [], 
			[bsTimesElapsedSaveKey]: [], 
			1: null,
		})
	})
})

describe("test BrowserStorage local storage with browser api mocking", () => {
	it("uses storage.sync.local if preferSync is false", async() => {
		const browserStorage = new BrowserStorage({ preferSync: false })

		mockBrowser.storage.local.get
			.mockResolvedValueOnce({ [bsIdsSaveKey]: [0] })
			.mockResolvedValueOnce({ [bsTimesElapsedSaveKey]: [0] })
			.mockResolvedValueOnce({ 0: compress(new BlockSet(0)) })

		expect(await browserStorage.loadBlockSets()).toEqual([blockSetCmpObj(new BlockSet(0))])

		expect(mockBrowser.storage.local.get.mock.calls).toEqual(expectedGetCalls({ 0: null }))
	})
})