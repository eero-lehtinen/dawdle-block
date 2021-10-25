/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { BlockSet, BlockTestRes } from "@src/background/blockSet"
import { BlockSets, NonExistentBlockSetError } from "@src/background/blockSets"
import { BrowserStorage } from "@src/background/browserStorage"
import { dateToTodayMS } from "@src/shared/utils"
import { ok } from "neverthrow"
import { insertMockBrowserStorageDefaults } from "../testHelpers/mockDefaults"
import { mocked } from "ts-jest/utils"
import blockSetCmpObj from "../testHelpers/blockSetCmpObj"

jest.mock("webextension-polyfill-ts", () => ({}))
jest.mock("@src/background/browserStorage")

insertMockBrowserStorageDefaults(BrowserStorage.prototype)
const mockBrowserStorage = mocked(BrowserStorage, true)

afterEach(() => {
	jest.clearAllMocks()
})

describe("test BlockSets construction", () => {
	const testBlockSet = BlockSet.createDefault(42)
	test("loads block sets from block set storage", async () => {
		mockBrowserStorage.prototype.fetchBlockSets.mockResolvedValue([ok(testBlockSet)])

		const blockSets = await BlockSets.create(new BrowserStorage({ preferSync: true }))
		expect(mockBrowserStorage).toBeCalledTimes(1)
		expect(blockSets.list).toStrictEqual([testBlockSet])
		expect(blockSets.map).toStrictEqual(new Map([[42, testBlockSet]]))
	})

	test("creates a default block set when storage is empty", async () => {
		mockBrowserStorage.prototype.fetchBlockSets.mockResolvedValue([])

		const blockSets = await BlockSets.create(new BrowserStorage({ preferSync: true }))
		expect(blockSets.list).toStrictEqual([blockSetCmpObj(BlockSet.createDefault(0))])
		expect(blockSets.map).toStrictEqual(
			new Map([[0, blockSetCmpObj(BlockSet.createDefault(0))]])
		)
	})
})

describe("test BlockSets methods", () => {
	let blockSets: BlockSets
	beforeEach(async () => {
		mockBrowserStorage.prototype.fetchBlockSets.mockResolvedValue([
			BlockSet.create(0, { name: "TEST" }),
		])
		blockSets = await BlockSets.create(new BrowserStorage({ preferSync: true }))
	})

	// New block sets should get saved to storage.
	// They should be assigned a non overlapping id.
	// Name should be "Block Set ${number}",
	// number is based on the amount of old block sets starting with "Block Set".
	test("can add new default block sets", async () => {
		const newBlockSet = (await blockSets.addDefaultBlockSet())._unsafeUnwrap()
		const bsIds = blockSets.getIds()

		// Check for duplicate ids
		expect(new Set(bsIds).size).toBe(bsIds.length)
		// Added block set is equal to default block set except from id and name
		const defaultBlockSet = BlockSet.createDefault(newBlockSet.id)
		defaultBlockSet.set("name", newBlockSet.data.name)
		expect(newBlockSet).toStrictEqual(blockSetCmpObj(defaultBlockSet))

		expect(blockSets.list).toContain(newBlockSet)
		expect(blockSets.map.get(newBlockSet.id)).toStrictEqual(newBlockSet)
		expect(mockBrowserStorage.prototype.saveNewBlockSet).toBeCalledWith(
			newBlockSet,
			blockSets.list
		)
	})

	test("added new block set name is 'Block Set ${number}' with restrictions", async () => {
		let newBlockSet = (await blockSets.addDefaultBlockSet())._unsafeUnwrap()
		expect(newBlockSet.data.name).toBe("Block Set 1")
		newBlockSet = (await blockSets.addDefaultBlockSet())._unsafeUnwrap()
		expect(newBlockSet.data.name).toBe("Block Set 2")

		newBlockSet.data.name = "Block Set 120"
		newBlockSet = (await blockSets.addDefaultBlockSet())._unsafeUnwrap()
		expect(newBlockSet.data.name).toBe("Block Set 121")
	})

	// Copied block sets should get saved to storage.
	// They should be assigned a non overlapping id.
	// Their name should have (copy) appended to the end.
	// If old name had "(copy)" already, then names should continue (copy2), (copy3) etc.
	test("can add new copies of block sets", async () => {
		const testBlockSet = BlockSet.create(100, { name: "TEST" })._unsafeUnwrap()
		const newBlockSet = (await blockSets.addBlockSetCopy(testBlockSet))._unsafeUnwrap()
		const bsIds = blockSets.getIds()

		// Check for duplicate ids
		expect(new Set(bsIds).size).toBe(bsIds.length)

		// Added block set is equal to copied block set except from id, name and time elapsed
		expect(newBlockSet.data).toStrictEqual({ ...testBlockSet.data, name: "TEST (copy)" })
		expect(newBlockSet.timeElapsed).toStrictEqual(0)

		expect(blockSets.list).toContain(newBlockSet)
		expect(blockSets.map.get(newBlockSet.id)).toStrictEqual(newBlockSet)
		expect(mockBrowserStorage.prototype.saveNewBlockSet).toBeCalledWith(
			newBlockSet,
			blockSets.list
		)
	})

	test("added new block set copy name is '${copyName} (copy${number}x)' with restrictions", async () => {
		const testBlockSet = BlockSet.create(100, { name: "TEST" })._unsafeUnwrap()
		let newBlockSet = (await blockSets.addBlockSetCopy(testBlockSet))._unsafeUnwrap()
		expect(newBlockSet.data.name).toStrictEqual(`${testBlockSet.data.name} (copy)`)
		newBlockSet = (await blockSets.addBlockSetCopy(testBlockSet))._unsafeUnwrap()
		expect(newBlockSet.data.name).toStrictEqual(`${testBlockSet.data.name} (copy)`)

		newBlockSet = (await blockSets.addBlockSetCopy(newBlockSet))._unsafeUnwrap()
		expect(newBlockSet.data.name).toStrictEqual(`${testBlockSet.data.name} (copy2x)`)

		newBlockSet = (await blockSets.addBlockSetCopy(newBlockSet))._unsafeUnwrap()
		expect(newBlockSet.data.name).toStrictEqual(`${testBlockSet.data.name} (copy3x)`)

		newBlockSet.data.name = "TEST (copy123x)"
		newBlockSet = (await blockSets.addBlockSetCopy(newBlockSet))._unsafeUnwrap()
		expect(newBlockSet.data.name).toStrictEqual(`${testBlockSet.data.name} (copy124x)`)
	})

	test("can remove block sets", async () => {
		const testBlockSet = blockSets.list[0]!
		await blockSets.deleteBlockSet(testBlockSet)

		expect(blockSets.list).toStrictEqual([])
		expect(blockSets.map.size).toStrictEqual(0)
		expect(mockBrowserStorage.prototype.deleteBlockSet).toBeCalledWith(testBlockSet, [])
	})

	test("can save block sets", async () => {
		const testBlockSet = blockSets.list[0]!
		await blockSets.saveBlockSet(testBlockSet)
		expect(mockBrowserStorage.prototype.saveBlockSet).toBeCalledWith(testBlockSet)
	})

	test("returns error when trying to save block set not included in the list", async () => {
		const testBlockSet = BlockSet.createDefault(5)
		expect((await blockSets.saveBlockSet(testBlockSet))._unsafeUnwrapErr()).toBeInstanceOf(
			NonExistentBlockSetError
		)
		expect(mockBrowserStorage.prototype.saveBlockSet).toBeCalledTimes(0)
	})
})

describe("test BlockSets blockedBy method", () => {
	let blockSets: BlockSets
	beforeEach(async () => {
		mockBrowserStorage.prototype.fetchBlockSets.mockImplementation(() => Promise.resolve([]))
		blockSets = await BlockSets.create(new BrowserStorage({ preferSync: true }))
		await blockSets.addDefaultBlockSet()
		await blockSets.addDefaultBlockSet()

		const list = blockSets.list
		for (const bs of list) {
			bs.isInActiveTime = jest.fn(() => true)
			bs.isInActiveWeekday = jest.fn(() => true)
			bs.test = jest.fn(() => BlockTestRes.Blacklisted)
		}
	})

	/* eslint-disable @typescript-eslint/no-non-null-assertion */

	test("block set methods are called with correct arguments", () => {
		const currentDate = new Date(2020, 1, 1, 8, 0, 0)
		jest.useFakeTimers()
		jest.setSystemTime(currentDate)
		blockSets.blockedBy("testUrl", "testCategoryId", "testChannelId")
		expect(blockSets.list[0]!.test).toBeCalledWith("testUrl", "testCategoryId", "testChannelId")
		expect(blockSets.list[0]!.isInActiveTime).toBeCalledWith(dateToTodayMS(currentDate))
		expect(blockSets.list[0]!.isInActiveWeekday).toBeCalledWith(currentDate.getDay())
	})

	test("returns ids of each block set returning Blacklisted", () => {
		expect(blockSets.blockedBy("", null, null)).toStrictEqual(blockSets.getIds())
	})

	test("Ignores ids of each block set returning Whitelisted or Ignored", () => {
		blockSets.list[0]!.test = jest.fn(() => BlockTestRes.Whitelisted)
		blockSets.list[1]!.test = jest.fn(() => BlockTestRes.Ignored)
		expect(blockSets.blockedBy("", null, null)).toStrictEqual([blockSets.list[2]!.id])
	})

	test("Ignores ids of each block set not being in active time or active day or both", () => {
		blockSets.list[0]!.isInActiveTime = jest.fn(() => false)
		blockSets.list[1]!.isInActiveWeekday = jest.fn(() => false)
		blockSets.list[2]!.isInActiveTime = jest.fn(() => false)
		blockSets.list[2]!.isInActiveWeekday = jest.fn(() => false)

		expect(blockSets.blockedBy("", null, null)).toStrictEqual([])
	})
})
