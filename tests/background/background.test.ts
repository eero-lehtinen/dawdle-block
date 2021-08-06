/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Background, updateInterval } from "@src/background/background"
import { BlockTestRes } from "@src/background/blockSet"
import { BlockSets } from "@src/background/blockSets"
import * as blockTabModule from "@src/background/blockTab"
import * as annoyTabModule from "@src/background/annoyTab"
import * as setBadgeModule from "@src/background/setBadge"
import * as youtubeAPIModule from "@src/background/youtubeAPI"
import { BrowserStorage } from "@src/background/browserStorage"
import { Listener, Observer } from "@src/background/observer"
import { TabLoadedEvent, TabObserver, TabRemovedEvent } from "@src/background/tabObserver"
import flushPromises from "flush-promises"
import "jest-extended"
import { GeneralOptions } from "@src/background/generalOptions"
import { insertMockBrowserStorageDefaults } from "../testHelpers/mockDefaults"

jest.mock("webextension-polyfill-ts", () => ({}))
jest.mock("@src/background/tabObserver")
jest.mock("@src/background/browserStorage")

insertMockBrowserStorageDefaults(BrowserStorage.prototype)

jest.useFakeTimers()

// Mock TabObserver
const mockLoadTab = new Observer<TabLoadedEvent>()
TabObserver.prototype.subscribeTabLoaded = jest.fn((listener: Listener<TabLoadedEvent>) =>
	mockLoadTab.subscribe(listener)
)

const mockRemoveTab = new Observer<TabRemovedEvent>()
TabObserver.prototype.subscribeTabRemoved = jest.fn((listener: Listener<TabRemovedEvent>) =>
	mockRemoveTab.subscribe(listener)
)

// Mock single functions from modules
jest.spyOn(youtubeAPIModule, "getYTInfo").mockResolvedValue(youtubeAPIModule.nullYTInfo())
const mockAnnoyTab = jest.spyOn(annoyTabModule, "annoyTab").mockReturnValue()
const mockSetBadge = jest.spyOn(setBadgeModule, "setBadge").mockResolvedValue()
const mockBlockTab = jest
	.spyOn(blockTabModule, "blockTab")
	.mockImplementation((tabId: number) => mockLoadTab.publish({ tabId, url: "block-page.html" }))

describe("test Background", () => {
	let browserStorage: BrowserStorage
	let tabObserver: TabObserver
	let blockSets: BlockSets
	let generalOptions: GeneralOptions
	let _background: Background

	beforeEach(async () => {
		browserStorage = new BrowserStorage({ preferSync: true })

		tabObserver = await TabObserver.create()

		blockSets = await BlockSets.create(browserStorage)
		await blockSets.deleteBlockSet(blockSets.list[0]!) // Delete default block set

		generalOptions = await GeneralOptions.create(browserStorage)

		_background = new Background({
			browserStorage,
			tabObserver,
			blockSets,
			generalOptions,
		})
	})

	afterEach(() => {
		jest.clearAllTimers()
		jest.clearAllMocks()
	})

	// ra: requireActive, am: annoyMode, ta: timeAllowed in milliseconds
	const initBlockSets = async (config: { am: boolean; ra: boolean; ta: number }[]) => {
		for (const c of config) {
			const blockSet = (await blockSets.addDefaultBlockSet())._unsafeUnwrap()
			blockSet.annoyMode = c.am
			blockSet.requireActive = c.ra
			blockSet.timeAllowed = c.ta
			blockSet.test = jest.fn(() => BlockTestRes.Blacklisted)
		}
	}

	const mockLoadTabs = async (tabs: { tabId: number; active: boolean }[]) => {
		tabObserver.getActiveTabIds = jest.fn(() =>
			tabs.filter(({ active }) => active).map(({ tabId }) => tabId)
		) as jest.Mock
		for (const tab of tabs) {
			mockLoadTab.publish({ tabId: tab.tabId, url: "http://TEST" })
		}
		await flushPromises()
	}

	const timeAllowed = 2000

	describe("update function updates block sets appropriately (only once)", () => {
		describe("when blockSet.annoyMode is false and blockSet.requireActive is false", () => {
			beforeEach(async () => {
				await initBlockSets([{ ra: false, am: false, ta: timeAllowed }])
			})

			test("existing non-active tabs increase blockSet.timeElapsed", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: false },
					{ tabId: 1, active: false },
				])
				jest.advanceTimersByTime(updateInterval)
				expect(blockSets.list[0]!.timeElapsed).toBe(updateInterval)
				expect(mockBlockTab).toBeCalledTimes(0)
				expect(mockAnnoyTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[updateInterval]])
			})

			test("existing active tabs increase blockSet.timeElapsed", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: true },
					{ tabId: 1, active: true },
				])
				jest.advanceTimersByTime(updateInterval)
				expect(blockSets.list[0]!.timeElapsed).toBe(updateInterval)
				expect(mockBlockTab).toBeCalledTimes(0)
				expect(mockAnnoyTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[updateInterval]])
			})

			test("existing non-active tabs get blocked when remaining time is zero", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: false },
					{ tabId: 1, active: false },
				])
				jest.advanceTimersByTime(timeAllowed)
				expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed)
				expect(mockBlockTab.mock.calls).toIncludeSameMembers([[0], [1]])
				expect(mockAnnoyTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[updateInterval], [0]])
			})

			test("existing active tabs get blocked when remaining time is zero", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: true },
					{ tabId: 1, active: true },
				])
				jest.advanceTimersByTime(timeAllowed)
				expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed)
				expect(mockBlockTab.mock.calls).toIncludeSameMembers([[0], [1]])
				expect(mockAnnoyTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[updateInterval], [0]])
			})

			test("we don't get into a blocking loop after opening block tab", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: false },
					{ tabId: 1, active: false },
				])
				jest.advanceTimersByTime(timeAllowed)
				expect(mockBlockTab).toBeCalledTimes(2)
				jest.advanceTimersByTime(updateInterval)
				expect(mockAnnoyTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[updateInterval], [0], [Infinity]])
			})

			test("timeElapsed does not overflow", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: false },
					{ tabId: 1, active: false },
				])
				jest.advanceTimersByTime(timeAllowed + updateInterval)
				expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed)
				expect(mockAnnoyTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[updateInterval], [0], [Infinity]])
			})
		})

		describe("when blockSet.annoyMode is false and blockSet.requireActive is true", () => {
			beforeEach(async () => {
				await initBlockSets([{ ra: true, am: false, ta: timeAllowed }])
			})

			test("existing non-active tabs don't increase blockSet.timeElapsed", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: false },
					{ tabId: 1, active: false },
				])
				jest.advanceTimersByTime(updateInterval)
				expect(blockSets.list[0]!.timeElapsed).toBe(0)
				expect(mockBlockTab).toBeCalledTimes(0)
				expect(mockAnnoyTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[Infinity]])
			})

			test("existing active tabs increase blockSet.timeElapsed", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: true },
					{ tabId: 1, active: true },
				])
				jest.advanceTimersByTime(updateInterval)
				expect(blockSets.list[0]!.timeElapsed).toBe(updateInterval)
				expect(mockBlockTab).toBeCalledTimes(0)
				expect(mockAnnoyTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[updateInterval]])
			})

			test("existing non-active tabs don't get blocked when remaining time is zero", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: false },
					{ tabId: 1, active: false },
				])
				blockSets.list[0]!.timeElapsed = timeAllowed
				jest.advanceTimersByTime(updateInterval)
				expect(mockBlockTab).toBeCalledTimes(0)
				expect(mockAnnoyTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[Infinity]])
			})

			test("existing active tabs get blocked when remaining time is zero", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: true },
					{ tabId: 1, active: true },
				])
				jest.advanceTimersByTime(timeAllowed)
				expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed)
				expect(mockBlockTab.mock.calls).toIncludeSameMembers([[0], [1]])
				expect(mockAnnoyTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[updateInterval], [0]])
			})

			test("timeElapsed does not overflow", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: true },
					{ tabId: 1, active: true },
				])
				jest.advanceTimersByTime(timeAllowed + updateInterval)
				expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed)
			})
		})

		describe("when blockSet.annoyMode is true and blockSet.requireActive is false", () => {
			beforeEach(async () => {
				await initBlockSets([{ ra: false, am: true, ta: timeAllowed }])
			})

			test("existing non-active tabs increase blockSet.timeElapsed", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: false },
					{ tabId: 1, active: false },
				])
				jest.advanceTimersByTime(updateInterval)
				expect(blockSets.list[0]!.timeElapsed).toBe(updateInterval)
				expect(mockBlockTab).toBeCalledTimes(0)
				expect(mockAnnoyTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[updateInterval]])
			})

			test("existing active tabs increase blockSet.timeElapsed", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: true },
					{ tabId: 1, active: true },
				])
				jest.advanceTimersByTime(updateInterval)
				expect(blockSets.list[0]!.timeElapsed).toBe(updateInterval)
				expect(mockBlockTab).toBeCalledTimes(0)
				expect(mockAnnoyTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[updateInterval]])
			})

			test("tabs don't get annoyed when timeElapsed == timeAllowed", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: true },
					{ tabId: 1, active: true },
				])
				jest.advanceTimersByTime(timeAllowed)
				expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed)
				expect(mockBlockTab).toBeCalledTimes(0)
				expect(mockAnnoyTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[updateInterval], [0]])
			})

			test("active tabs get annoyed when timeElapsed > timeAllowed", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: false },
					{ tabId: 1, active: false },
					{ tabId: 2, active: true },
					{ tabId: 3, active: true },
				])
				jest.advanceTimersByTime(timeAllowed + updateInterval)
				expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed + updateInterval)
				// arguments for annoyTab are (tabId, msOvertime)
				expect(mockAnnoyTab.mock.calls).toIncludeSameMembers(
					[2, 3].map(id => [id, updateInterval])
				)
				expect(mockBlockTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[updateInterval], [0], [-updateInterval]])
			})

			test("active tabs are annoyed with the largest overtime", async () => {
				// this blockset has less timeAllowed
				// => it will have more overtime after updates
				// => it's overtime should be shown as it has the most overtime
				await initBlockSets([{ ra: false, am: true, ta: updateInterval }])

				await mockLoadTabs([
					{ tabId: 0, active: false },
					{ tabId: 1, active: false },
					{ tabId: 2, active: true },
					{ tabId: 3, active: true },
				])
				jest.advanceTimersByTime(timeAllowed + updateInterval)
				expect(mockAnnoyTab.mock.calls.slice(-2)).toIncludeSameMembers(
					[2, 3].map(id => [id, blockSets.list[1]!.overtime])
				)
				expect(mockAnnoyTab).toBeCalledTimes(4)
				expect(mockBlockTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[0], [-updateInterval], [-2 * updateInterval]])
			})
		})

		describe("when blockSet.annoyMode is true and and blockSet.requireActive is true", () => {
			beforeEach(async () => {
				await initBlockSets([{ ra: true, am: true, ta: timeAllowed }])
			})

			test("existing non-active tabs don't increase blockSet.timeElapsed", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: false },
					{ tabId: 1, active: false },
				])
				jest.advanceTimersByTime(updateInterval)
				expect(blockSets.list[0]!.timeElapsed).toBe(0)
				expect(mockBlockTab).toBeCalledTimes(0)
				expect(mockAnnoyTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[Infinity]])
			})

			test("existing active tabs increase blockSet.timeElapsed", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: true },
					{ tabId: 1, active: true },
				])
				jest.advanceTimersByTime(updateInterval)
				expect(blockSets.list[0]!.timeElapsed).toBe(updateInterval)
				expect(mockBlockTab).toBeCalledTimes(0)
				expect(mockAnnoyTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[updateInterval]])
			})

			test("tabs don't get annoyed when timeElapsed == timeAllowed", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: true },
					{ tabId: 1, active: true },
				])
				jest.advanceTimersByTime(timeAllowed)
				expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed)
				expect(mockBlockTab).toBeCalledTimes(0)
				expect(mockAnnoyTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[updateInterval], [0]])
			})

			test("active tabs get annoyed when timeElapsed > timeAllowed", async () => {
				await mockLoadTabs([
					{ tabId: 0, active: false },
					{ tabId: 1, active: false },
					{ tabId: 2, active: true },
					{ tabId: 3, active: true },
				])
				jest.advanceTimersByTime(timeAllowed + updateInterval)
				expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed + updateInterval)
				// arguments for annoyTab are (tabId, msOvertime)
				expect(mockAnnoyTab.mock.calls).toIncludeSameMembers(
					[2, 3].map(id => [id, updateInterval])
				)
				expect(mockBlockTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[updateInterval], [0], [-updateInterval]])
			})

			test("active tabs are annoyed with the largest overtime", async () => {
				// this blockset has less timeAllowed
				// => it will have more overtime after updates
				// => it's overtime should be shown as it has the most overtime
				await initBlockSets([{ ra: true, am: true, ta: 0 }])

				await mockLoadTabs([
					{ tabId: 0, active: false },
					{ tabId: 1, active: false },
					{ tabId: 2, active: true },
					{ tabId: 3, active: true },
				])
				jest.advanceTimersByTime(timeAllowed + updateInterval)
				expect(mockAnnoyTab.mock.calls.slice(-2)).toIncludeSameMembers(
					[2, 3].map(id => [id, blockSets.list[1]!.overtime])
				)
				expect(mockBlockTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([
					[-updateInterval],
					[-2 * updateInterval],
					[-3 * updateInterval],
				])
			})
		})

		describe("largest overtime is chosen for annoy regardless of requireActive", () => {
			test("blockset with largest overtime (in this case requireActive=true) is chosen", async () => {
				await initBlockSets([
					{ ra: true, am: true, ta: 0 }, // larger overtime
					{ ra: false, am: true, ta: updateInterval },
				])

				await mockLoadTabs([
					{ tabId: 0, active: false },
					{ tabId: 1, active: false },
					{ tabId: 2, active: true },
					{ tabId: 3, active: true },
				])

				jest.advanceTimersByTime(updateInterval * 2)
				// only active tabs
				expect(mockAnnoyTab.mock.calls.slice(-2)).toIncludeSameMembers(
					[2, 3].map(id => [id, blockSets.list[0]!.overtime])
				)
				expect(mockBlockTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[-updateInterval], [-2 * updateInterval]])
			})

			test("blockset with largest overtime (in this case requireActive=false) is chosen", async () => {
				await initBlockSets([
					{ ra: true, am: true, ta: updateInterval },
					{ ra: false, am: true, ta: 0 }, // larger overtime
				])

				await mockLoadTabs([
					{ tabId: 0, active: false },
					{ tabId: 1, active: false },
					{ tabId: 2, active: true },
					{ tabId: 3, active: true },
				])

				jest.advanceTimersByTime(updateInterval * 2)
				// affects all tabs
				expect(mockAnnoyTab.mock.calls.slice(-2)).toIncludeSameMembers(
					[2, 3].map(id => [id, blockSets.list[1]!.overtime])
				)
				expect(mockBlockTab).toBeCalledTimes(0)
				expect(mockSetBadge.mock.calls).toEqual([[-updateInterval], [-2 * updateInterval]])
			})
		})

		test("does nothing when tabs are empty", async () => {
			await initBlockSets([
				{ ra: true, am: true, ta: timeAllowed },
				{ ra: false, am: true, ta: timeAllowed },
			])
			await mockLoadTabs([])

			jest.advanceTimersByTime(updateInterval * 2)
			expect(mockAnnoyTab).toBeCalledTimes(0)
			expect(mockBlockTab).toBeCalledTimes(0)
			expect(mockSetBadge.mock.calls).toEqual([[Infinity], [Infinity]])
		})

		test("does nothing when block sets are empty", async () => {
			await initBlockSets([])
			await mockLoadTabs([
				{ tabId: 0, active: false },
				{ tabId: 1, active: false },
				{ tabId: 2, active: true },
				{ tabId: 3, active: true },
			])

			jest.advanceTimersByTime(updateInterval * 2)
			expect(mockAnnoyTab).toBeCalledTimes(0)
			expect(mockBlockTab).toBeCalledTimes(0)
			expect(mockSetBadge.mock.calls).toEqual([[Infinity], [Infinity]])
		})

		test("does nothing when block sets and tabs are empty are empty", async () => {
			await initBlockSets([])
			await mockLoadTabs([])

			jest.advanceTimersByTime(updateInterval * 2)
			expect(mockAnnoyTab).toBeCalledTimes(0)
			expect(mockBlockTab).toBeCalledTimes(0)
			expect(mockSetBadge.mock.calls).toEqual([[Infinity], [Infinity]])
		})
	})

	test.todo("removed tabs are not processed")

	// Block set may be configured to be disabled on certain week days,
	// e.g. off on weekends and on other days.
	// Blocking needs to be reevaluated when disabled status changes.
	test.todo("updates all tabs when active day may have changed")

	// Block set may be configured to be disabled e.g. from 8 pm to 12 am.
	// Blocking needs to be reevaluated when disabled status changes.
	test.todo("updates all tabs when active time may have changed")
})
