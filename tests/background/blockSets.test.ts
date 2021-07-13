import { BlockSet } from "@src/background/blockSet"
import { BlockSets } from "@src/background/blockSets"
import { BrowserStorage } from "@src/background/browserStorage"
import { mocked } from "ts-jest/utils"

jest.mock("@src/background/browserStorage")

const browserStorageMock = mocked(BrowserStorage, true)

describe("test BlockSets construction", () => {
	it("loads block sets from block set storage", async() => {
		browserStorageMock.prototype.loadBlockSets
			.mockImplementation(async() => Promise.resolve([new BlockSet(42)]))

		const blockSets = await BlockSets.create()
		expect(browserStorageMock).toBeCalledTimes(1)
		expect(blockSets.list).toStrictEqual([new BlockSet(42)])
	})
	
	it("creates a default block set when storage is empty", async() => {
		browserStorageMock.prototype.loadBlockSets
			.mockImplementation(async() => Promise.resolve([]))
		
		const blockSets = await BlockSets.create()
		expect(blockSets.list).toStrictEqual([new BlockSet(0)])
	})
})

describe("test BlockSets methods", () => {
	let blockSets: BlockSets
	beforeEach(async() => {
		browserStorageMock.prototype.loadBlockSets
			.mockImplementation(async() => Promise.resolve([new BlockSet(0, { name: "TEST" })]))
		blockSets = await BlockSets.create()
	})

	// New block sets should get saved to storage.
	// They should be assigned a non overlapping id.
	// Name should be "Block Set ${number}", 
	// number is based on the amount of old block sets starting with "Block Set".
	it("can add new default block sets", async() => {
		const newBlockSet = await blockSets.addDefaultBlockSet()
		const bsIds = blockSets.getIds()

		// Check for duplicate ids
		expect(new Set(bsIds).size).toBe(bsIds.length) 
		// Added block set is equal to default block set except from id and name
		const defaultBlockSet = new BlockSet(newBlockSet.id)
		defaultBlockSet.name = newBlockSet.name
		expect(newBlockSet).toMatchObject(defaultBlockSet)

		expect(blockSets.list).toContain(newBlockSet)
		expect(browserStorageMock.prototype.saveNewBlockSet)
			.toBeCalledWith(newBlockSet, blockSets.getIds())
	})

	it("added new block set name is 'Block Set ${number}' with restrictions", async() => {
		let newBlockSet = await blockSets.addDefaultBlockSet()
		expect(newBlockSet.name).toBe("Block Set 1")
		newBlockSet = await blockSets.addDefaultBlockSet()
		expect(newBlockSet.name).toBe("Block Set 2")

		newBlockSet.name = "Block Set 120"
		newBlockSet = await blockSets.addDefaultBlockSet()
		expect(newBlockSet.name).toBe("Block Set 121")
	})

	// Copied block sets should get saved to storage.
	// They should be assigned a non overlapping id.
	// Their name should have (copy) appended to the end.
	// If old name had "(copy)" already, then names should continue (copy2), (copy3) etc.
	it("can add new copies of block sets", async() => {
		const testBlockSet = new BlockSet(100, { name: "TEST" })
		const newBlockSet = await blockSets.addBlockSetCopy(testBlockSet)
		const bsIds = blockSets.getIds()

		// Check for duplicate ids
		expect(new Set(bsIds).size).toBe(bsIds.length)

		// Added block set is equal to copied block set except from id, name and time elapsed
		expect(newBlockSet.data).toStrictEqual({ ...testBlockSet.data, name: "TEST (copy)" })
		expect(newBlockSet.timeElapsed).toStrictEqual(0)

		expect(blockSets.list).toContain(newBlockSet)
		expect(browserStorageMock.prototype.saveNewBlockSet)
			.toBeCalledWith(newBlockSet, blockSets.getIds())
	})

	it("added new block set copy name is '${copyName} (copy${number}x)' " +
	"with restrictions", async() => {
		const testBlockSet = new BlockSet(100, { name: "TEST" })
		let newBlockSet = await blockSets.addBlockSetCopy(testBlockSet)
		expect(newBlockSet.name).toStrictEqual(`${testBlockSet.name} (copy)`)
		newBlockSet = await blockSets.addBlockSetCopy(testBlockSet)
		expect(newBlockSet.name).toStrictEqual(`${testBlockSet.name} (copy)`)

		newBlockSet = await blockSets.addBlockSetCopy(newBlockSet)
		expect(newBlockSet.name).toStrictEqual(`${testBlockSet.name} (copy2x)`)

		newBlockSet = await blockSets.addBlockSetCopy(newBlockSet)
		expect(newBlockSet.name).toStrictEqual(`${testBlockSet.name} (copy3x)`)

		newBlockSet.name = "TEST (copy123x)"
		newBlockSet = await blockSets.addBlockSetCopy(newBlockSet)
		expect(newBlockSet.name).toStrictEqual(`${testBlockSet.name} (copy124x)`)
		
	})
})



describe("test BlockSets blockedBy method", () => {
	beforeEach(() => {
		browserStorageMock.prototype.loadBlockSets
			.mockImplementation(async() => Promise.resolve([]))
	})

	it.todo("returns ids of each matching block set")
})
