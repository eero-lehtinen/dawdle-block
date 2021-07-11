import { BlockSet } from "@src/background/blockSet"
import { BlockSets } from "@src/background/blockSets"
import { BlockSetStorage } from "@src/background/blockSetStorage"
import { mocked } from "ts-jest/utils"

jest.mock("@src/background/blockSetStorage")

const blockSetStorageMock = mocked(BlockSetStorage, true)

describe("test BlockSets", () => {
	it("loads block sets from block set storage", async() => {
		blockSetStorageMock.prototype.loadBlockSets
			.mockImplementation(async() => Promise.resolve([new BlockSet(42)]))

		const blockSets = await BlockSets.create()
		expect(blockSetStorageMock).toBeCalledTimes(1)
		expect(blockSets.blockSets).toStrictEqual([new BlockSet(42)])
	})
	
	it.todo("creates a default block set when storage is empty")
	it.todo("returns ids of each matching block set")
})
