import type { Browser } from "webextension-polyfill-ts"
import { deepMock } from "mockzilla"

const [browser, mockBrowser, mockBrowserNode] = deepMock<Browser>("browser", false)

jest.mock("webextension-polyfill-ts", () => ({ browser }))

import { BlockSetManager, bsIdsSaveKey, bsTimesElapsedSaveKey } from "../background/block-set-manager"
import { BlockSet } from "../background/block-set"
import { BlockSetIds, BlockSetTimesElapsed } from "../background/block-set-parser"

describe("test BlockSetManager with browser api mocking", () => {
	
	beforeEach(() => mockBrowserNode.enable())

	afterEach(() => mockBrowserNode.verifyAndDisable())

	const setUpMockStorage = (idReturn: BlockSetIds, 
		elapsedReturn: BlockSetTimesElapsed) => {
		mockBrowser.storage.sync.get.expect({ [bsIdsSaveKey]: [0] })
			.andResolve({ [bsIdsSaveKey]: idReturn })
		mockBrowser.storage.sync.get.expect({ [bsTimesElapsedSaveKey]: [0] })
			.andResolve({ [bsTimesElapsedSaveKey]: elapsedReturn })
	}

	it("can load block set ids, blocksets, and elapsed times from sync storage", async() => {
		setUpMockStorage([0], [0])
		mockBrowser.storage.sync.get.expect({ "0": undefined })
			.andResolve({ "0": undefined })

		const bsManager = await BlockSetManager.create()
		expect(bsManager.getBSIds()).toStrictEqual([0])
		expect(bsManager.getBSTimesElapsed()).toStrictEqual([0])
		expect(bsManager.getBSs()).toMatchObject([new BlockSet()])
	})

	it("can handle non continous ids", async() => {
		setUpMockStorage([3, 2], [undefined, undefined, 0, 0])
		mockBrowser.storage.sync.get.expect({ "3": undefined, "2": undefined })
			.andResolve({ "3": undefined, "2": undefined })

		const bsManager = await BlockSetManager.create()
		expect(bsManager.getBSIds()).toStrictEqual([3, 2])
		expect(bsManager.getBSTimesElapsed()).toMatchObject([undefined, undefined, 0, 0])
		expect(bsManager.getBSs()).toMatchObject([undefined, undefined, new BlockSet(), new BlockSet()])
	})
})

