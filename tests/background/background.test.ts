/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Background, updateInterval } from "@src/background/background"
import { BlockTestRes } from "@src/background/blockSet"
import { BlockSets } from "@src/background/blockSets"
import * as blockTabModule from "@src/background/blockTab"
import * as annoyTabModule from "@src/background/annoyTab"
import * as youtubeAPIModule from "@src/background/youtubeAPI"
import { BrowserStorage } from "@src/background/browserStorage"
import { Listener, Observer } from "@src/background/observer"
import { TabLoadedEvent, TabObserver, TabRemovedEvent } from "@src/background/tabObserver"
import flushPromises from "flush-promises"

jest.mock("@src/background/tabObserver")
jest.mock("@src/background/browserStorage")

jest.useFakeTimers()

jest.spyOn(youtubeAPIModule, "getYTInfo").mockImplementation(
	() => Promise.resolve(youtubeAPIModule.nullYTInfo()))

describe("test Background", () => {
	let browserStorage: BrowserStorage
	let tabObserver: TabObserver
	let blockSets: BlockSets
	let _background: Background
	let mockLoadTab: Observer<TabLoadedEvent>
	let mockRemoveTab: Observer<TabRemovedEvent>
	let mockedBlockTab: jest.SpyInstance
	let mockedAnnoyTab: jest.SpyInstance
	let _mockedSetBadge: jest.SpyInstance

	beforeEach(async() => {

		browserStorage = new BrowserStorage({ preferSync: true })
		browserStorage.loadBlockSets = jest.fn(async() => Promise.resolve([])) as jest.Mock

		tabObserver = await TabObserver.create()

		mockLoadTab = new Observer<TabLoadedEvent>()
		tabObserver.subscribeTabLoaded = jest.fn((listener: Listener<TabLoadedEvent>) => {
			return mockLoadTab.subscribe(listener)
		}) as jest.Mock

		mockRemoveTab = new Observer<TabRemovedEvent>()
		tabObserver.subscribeTabRemoved = jest.fn((listener: Listener<TabRemovedEvent>) => {
			return mockRemoveTab.subscribe(listener)
		}) as jest.Mock

		mockedBlockTab = jest.spyOn(blockTabModule, "blockTab").mockImplementation((tabId: number) => {
			mockLoadTab.publish({ tabId, url: "block-page.html" })
		})

		mockedAnnoyTab = jest.spyOn(annoyTabModule, "annoyTab").mockImplementation(
			() => {/* do nothing */})

		blockSets = await BlockSets.create(browserStorage)
		await blockSets.deleteBlockSet(blockSets.list[0]!) // Delete default block set

		_background = new Background(browserStorage, tabObserver, blockSets)
	})

	afterEach(() => {
		jest.clearAllTimers()
		jest.clearAllMocks()
	})

	// ra: requireActive, am: annoyMode, ta: timeAllowed in milliseconds
	const initBlockSets = async(config: {am: boolean, ra: boolean, ta: number}[]) => {
		for (const c of config) {
			const blockSet = await blockSets.addDefaultBlockSet()
			blockSet.annoyMode = c.am
			blockSet.requireActive = c.ra
			blockSet.timeAllowed = c.ta
			blockSet.test = jest.fn().mockImplementation(() => BlockTestRes.Blacklisted)
		}
	}

	const mockLoadTabs = async(tabs: {tabId: number, active: boolean}[]) => {
		tabObserver.getActiveTabIds = jest.fn(() => 
			tabs.filter(({ active }) => active).map(({ tabId }) => tabId)) as jest.Mock
		for (const tab of tabs) {
			mockLoadTab.publish({ tabId: tab.tabId, url: "http://TEST" })
		}
		await flushPromises()
	}

	describe("update function updates block sets appropriately (only once)", () => {
		describe("when blockSet.annoyMode is false", () => {
			const timeAllowed = 2000

			describe("and blockSet.requireActive is false", () => {
				beforeEach(async() => {
					await initBlockSets([{ ra: false, am: false, ta: timeAllowed }])
				})

				it("existing non-active tabs increase blockSet.timeElapsed", async() => {
					await mockLoadTabs([
						{ tabId: 0, active: false },
						{ tabId: 1, active: false }])
					jest.advanceTimersByTime(updateInterval)
					expect(blockSets.list[0]!.timeElapsed).toBe(updateInterval)
					expect(mockedBlockTab).toBeCalledTimes(0)
					expect(mockedAnnoyTab).toBeCalledTimes(0)
				})
			
				it("existing active tabs increase blockSet.timeElapsed", async() => {
					await mockLoadTabs([
						{ tabId: 0, active: true },
						{ tabId: 1, active: true }])
					jest.advanceTimersByTime(updateInterval)
					expect(blockSets.list[0]!.timeElapsed).toBe(updateInterval)
					expect(mockedBlockTab).toBeCalledTimes(0)
					expect(mockedAnnoyTab).toBeCalledTimes(0)
				})
				
				it("existing non-active tabs get blocked when remaining time is zero", async() => {
					await mockLoadTabs([
						{ tabId: 0, active: false },
						{ tabId: 1, active: false }])
					jest.advanceTimersByTime(timeAllowed)
					expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed)
					expect(mockedBlockTab.mock.calls).toEqual(expect.arrayContaining([[0], [1]]))
					expect(mockedBlockTab).toBeCalledTimes(2)
					expect(mockedAnnoyTab).toBeCalledTimes(0)
				})

				it("existing active tabs get blocked when remaining time is zero", async() => {
					await mockLoadTabs([
						{ tabId: 0, active: true },
						{ tabId: 1, active: true }]) 
					jest.advanceTimersByTime(timeAllowed)
					expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed)
					expect(mockedBlockTab.mock.calls).toEqual(expect.arrayContaining([[0], [1]]))
					expect(mockedBlockTab).toBeCalledTimes(2)
					expect(mockedAnnoyTab).toBeCalledTimes(0)
				})

				it("we don't get into a blocking loop after opening block tab", async() => {				
					await mockLoadTabs([
						{ tabId: 0, active: false },
						{ tabId: 1, active: false }])
					jest.advanceTimersByTime(timeAllowed)
					expect(mockedBlockTab).toBeCalledTimes(2)
					jest.advanceTimersByTime(updateInterval)
					expect(mockedAnnoyTab).toBeCalledTimes(0)
				})

				it("timeElapsed does not overflow", async() => {	
					await mockLoadTabs([
						{ tabId: 0, active: false },
						{ tabId: 1, active: false }])
					jest.advanceTimersByTime(timeAllowed + updateInterval)
					expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed)
					expect(mockedAnnoyTab).toBeCalledTimes(0)
				})
			})

			describe("and blockSet.requireActive is true", () => {
				beforeEach(async() => {
					await initBlockSets([{ ra: true, am: false, ta: timeAllowed }])
				})
				it("existing non-active tabs don't increase blockSet.timeElapsed", async() => {
					await mockLoadTabs([
						{ tabId: 0, active: false },
						{ tabId: 1, active: false }])
					jest.advanceTimersByTime(updateInterval)
					expect(blockSets.list[0]!.timeElapsed).toBe(0)
					expect(mockedBlockTab).toBeCalledTimes(0)
					expect(mockedAnnoyTab).toBeCalledTimes(0)
				})
			
				it("existing active tabs increase blockSet.timeElapsed", async() => {
					await mockLoadTabs([
						{ tabId: 0, active: true },
						{ tabId: 1, active: true }])
					jest.advanceTimersByTime(updateInterval)
					expect(blockSets.list[0]!.timeElapsed).toBe(updateInterval)
					expect(mockedBlockTab).toBeCalledTimes(0)
					expect(mockedAnnoyTab).toBeCalledTimes(0)
				})
				
				it("existing non-active tabs don't get blocked when remaining time is zero", async() => {
					await mockLoadTabs([
						{ tabId: 0, active: false },
						{ tabId: 1, active: false }])
					blockSets.list[0]!.timeElapsed = timeAllowed
					jest.advanceTimersByTime(updateInterval)
					expect(mockedBlockTab).toBeCalledTimes(0)
					expect(mockedAnnoyTab).toBeCalledTimes(0)
				})

				it("existing active tabs get blocked when remaining time is zero", async() => {
					await mockLoadTabs([
						{ tabId: 0, active: true },
						{ tabId: 1, active: true }]) 
					jest.advanceTimersByTime(timeAllowed)
					expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed)
					expect(mockedBlockTab).toBeCalledWith(0)
					expect(mockedBlockTab).toBeCalledWith(1)
					expect(mockedBlockTab).toBeCalledTimes(2)
					expect(mockedAnnoyTab).toBeCalledTimes(0)
				})

				it("timeElapsed does not overflow", async() => {	
					await mockLoadTabs([
						{ tabId: 0, active: true },
						{ tabId: 1, active: true }])
					jest.advanceTimersByTime(timeAllowed + updateInterval)
					expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed)
				})
			})
		})

		describe("when blockSet.annoyMode is true", () => {
			const timeAllowed = 2000

			describe("and blockSet.requireActive is false", () => {
				beforeEach(async() => {
					await initBlockSets([{ ra: false, am: true, ta: timeAllowed }])
				})

				it("existing non-active tabs increase blockSet.timeElapsed", async() => {
					await mockLoadTabs([
						{ tabId: 0, active: false },
						{ tabId: 1, active: false }])
					jest.advanceTimersByTime(updateInterval)
					expect(blockSets.list[0]!.timeElapsed).toBe(updateInterval)
					expect(mockedBlockTab).toBeCalledTimes(0)
					expect(mockedAnnoyTab).toBeCalledTimes(0)
				})
			
				it("existing active tabs increase blockSet.timeElapsed", async() => {
					await mockLoadTabs([
						{ tabId: 0, active: true },
						{ tabId: 1, active: true }])
					jest.advanceTimersByTime(updateInterval)
					expect(blockSets.list[0]!.timeElapsed).toBe(updateInterval)
					expect(mockedBlockTab).toBeCalledTimes(0)
					expect(mockedAnnoyTab).toBeCalledTimes(0)
				})

				it("tabs don't get annoyed when timeElapsed == timeAllowed", async() => {
					await mockLoadTabs([
						{ tabId: 0, active: true },
						{ tabId: 1, active: true }])
					jest.advanceTimersByTime(timeAllowed)
					expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed)
					expect(mockedBlockTab).toBeCalledTimes(0)
					expect(mockedAnnoyTab).toBeCalledTimes(0)
				})
				
				it("all tabs get annoyed when timeElapsed > timeAllowed", async() => {
					await mockLoadTabs([
						{ tabId: 0, active: false }, { tabId: 1, active: false },
						{ tabId: 2, active: true }, { tabId: 3, active: true },
					])
					jest.advanceTimersByTime(timeAllowed + updateInterval)
					expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed + updateInterval)
					expect(mockedAnnoyTab).toBeCalledTimes(4)
					// arguments for annoyTab are (tabId, msOvertime)
					expect(mockedAnnoyTab.mock.calls).toEqual(
						expect.arrayContaining([0, 1, 2, 3].map(id => [id, updateInterval])))
					expect(mockedBlockTab).toBeCalledTimes(0)
				})

				it("all tabs are annoyed with the largest overtime", async() => {	
					// this blockset has less timeAllowed 
					// => it will have more overtime after updates
					// => it's overtime should be shown as it has the most overtime
					await initBlockSets([{ ra: false, am: true, ta: updateInterval }])	
					
					await mockLoadTabs([
						{ tabId: 0, active: false }, { tabId: 1, active: false },
						{ tabId: 2, active: true }, { tabId: 3, active: true },
					])
					jest.advanceTimersByTime(timeAllowed + updateInterval)
					expect(mockedAnnoyTab.mock.calls.slice(-4)).toEqual(
						expect.arrayContaining([0, 1, 2, 3].map(id => [id, blockSets.list[1]!.overtime])))
					expect(mockedBlockTab).toBeCalledTimes(0)
				})
			})

			describe("and blockSet.requireActive is true", () => {
				beforeEach(async() => {
					await initBlockSets([{ ra: true, am: true, ta: timeAllowed }])
				})

				it("existing non-active tabs don't increase blockSet.timeElapsed", async() => {
					await mockLoadTabs([
						{ tabId: 0, active: false },
						{ tabId: 1, active: false }])
					jest.advanceTimersByTime(updateInterval)
					expect(blockSets.list[0]!.timeElapsed).toBe(0)
					expect(mockedBlockTab).toBeCalledTimes(0)
					expect(mockedAnnoyTab).toBeCalledTimes(0)
				})
			
				it("existing active tabs increase blockSet.timeElapsed", async() => {
					await mockLoadTabs([
						{ tabId: 0, active: true },
						{ tabId: 1, active: true }])
					jest.advanceTimersByTime(updateInterval)
					expect(blockSets.list[0]!.timeElapsed).toBe(updateInterval)
					expect(mockedBlockTab).toBeCalledTimes(0)
					expect(mockedAnnoyTab).toBeCalledTimes(0)
				})

				it("tabs don't get annoyed when timeElapsed == timeAllowed", async() => {
					await mockLoadTabs([
						{ tabId: 0, active: true },
						{ tabId: 1, active: true }])
					jest.advanceTimersByTime(timeAllowed)
					expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed)
					expect(mockedBlockTab).toBeCalledTimes(0)
					expect(mockedAnnoyTab).toBeCalledTimes(0)
				})
				
				it("active tabs get annoyed when timeElapsed > timeAllowed", async() => {
					await mockLoadTabs([
						{ tabId: 0, active: false }, { tabId: 1, active: false },
						{ tabId: 2, active: true }, { tabId: 3, active: true },
					])
					jest.advanceTimersByTime(timeAllowed + updateInterval)
					expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed + updateInterval)
					expect(mockedAnnoyTab).toBeCalledTimes(2)
					// arguments for annoyTab are (tabId, msOvertime)
					expect(mockedAnnoyTab.mock.calls).toEqual(
						expect.arrayContaining([2, 3].map(id => [id, updateInterval])))
					expect(mockedBlockTab).toBeCalledTimes(0)
				})

				it("active tabs are annoyed with the largest overtime", async() => {	
					// this blockset has less timeAllowed 
					// => it will have more overtime after updates
					// => it's overtime should be shown as it has the most overtime
					await initBlockSets([{ ra: true, am: true, ta: 0 }])	
					
					await mockLoadTabs([
						{ tabId: 0, active: false }, { tabId: 1, active: false },
						{ tabId: 2, active: true }, { tabId: 3, active: true },
					])
					jest.advanceTimersByTime(timeAllowed + updateInterval)
					expect(mockedAnnoyTab.mock.calls.slice(-2)).toEqual(
						expect.arrayContaining([2, 3].map(id => [id, blockSets.list[1]!.overtime])))
					expect(mockedBlockTab).toBeCalledTimes(0)
				})
			})
		})

		describe("largest overtime is chosen for annoy regardless of requireActive", () => {
			it("blockset with largest overtime (in this case requireActive=true) " +
				"is chosen", async() => {
				await initBlockSets([
					{ ra: true, am: true, ta: 0 }, // larger overtime
					{ ra: false, am: true, ta: updateInterval },
				])

				await mockLoadTabs([
					{ tabId: 0, active: false }, { tabId: 1, active: false },
					{ tabId: 2, active: true }, { tabId: 3, active: true },
				])
					
				jest.advanceTimersByTime(updateInterval * 2)
				// only active tabs
				expect(mockedAnnoyTab.mock.calls.slice(-2)).toEqual(
					expect.arrayContaining([2, 3].map(id => [id, blockSets.list[0]!.overtime])))
				expect(mockedBlockTab).toBeCalledTimes(0)
			})

			it("blockset with largest overtime (in this case requireActive=false) " +
				"is chosen", async() => {
				await initBlockSets([
					{ ra: true, am: true, ta: updateInterval }, 
					{ ra: false, am: true, ta: 0 }, // larger overtime
				])

				await mockLoadTabs([
					{ tabId: 0, active: false }, { tabId: 1, active: false },
					{ tabId: 2, active: true }, { tabId: 3, active: true },
				])
					
				jest.advanceTimersByTime(updateInterval * 2)
				// affects all tabs
				expect(mockedAnnoyTab.mock.calls.slice(-4)).toEqual(
					expect.arrayContaining([2, 3].map(id => [id, blockSets.list[1]!.overtime])))
				expect(mockedBlockTab).toBeCalledTimes(0)
			})
		})

		it("does nothing when tabs are empty", async() => {
			await initBlockSets([
				{ ra: true, am: true, ta: 0 }, // larger overtime
				{ ra: false, am: true, ta: updateInterval },
			])
			await mockLoadTabs([])

			jest.advanceTimersByTime(updateInterval * 2)
			expect(mockedAnnoyTab).toBeCalledTimes(0)
			expect(mockedBlockTab).toBeCalledTimes(0)
		})

		it("does nothing when block sets are empty", async() => {
			await initBlockSets([])
			await mockLoadTabs([
				{ tabId: 0, active: false }, { tabId: 1, active: false },
				{ tabId: 2, active: true }, { tabId: 3, active: true },
			])
			
			jest.advanceTimersByTime(updateInterval * 2)
			expect(mockedAnnoyTab).toBeCalledTimes(0)
			expect(mockedBlockTab).toBeCalledTimes(0)
		})

		it("does nothing when block sets and tabs are empty are empty", async() => {
			await initBlockSets([])
			await mockLoadTabs([])

			jest.advanceTimersByTime(updateInterval * 2)
			expect(mockedAnnoyTab).toBeCalledTimes(0)
			expect(mockedBlockTab).toBeCalledTimes(0)
		})
	})

	// Block set may be configured to be disabled on certain week days, 
	// e.g. off on weekends and on other days.
	// Blocking needs to be reevaluated when disabled status changes.
	it.todo("updates all tabs when active day may have changed")

	// Block set may be configured to be disabled e.g. from 8 pm to 12 am.
	// Blocking needs to be reevaluated when disabled status changes.
	it.todo("updates all tabs when active time may have changed")
})