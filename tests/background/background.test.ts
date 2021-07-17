/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Background, updateInterval } from "@src/background/background"
import { BlockTestRes } from "@src/background/blockSet"
import { BlockSets } from "@src/background/blockSets"
import * as blockTab from "@src/background/blockTab"
import { BrowserStorage } from "@src/background/browserStorage"
import { Listener, Observer } from "@src/background/observer"
import { TabLoadedEvent, TabObserver, TabRemovedEvent } from "@src/background/tabObserver"
import { MockedObject } from "ts-jest/dist/utils/testing"
import { mocked } from "ts-jest/utils"

jest.mock("@src/background/tabObserver")
jest.mock("@src/background/browserStorage")

jest.useFakeTimers()

describe("test Background", () => {
	let browserStorage: BrowserStorage
	let tabObserver: MockedObject<TabObserver>
	let blockSets: BlockSets
	let _background: Background
	let mockLoadTab: Observer<TabLoadedEvent>
	let mockRemoveTab: Observer<TabRemovedEvent>
	let mockedBlockTab: jest.SpyInstance

	beforeEach(async() => {

		browserStorage = new BrowserStorage({ preferSync: true })
		browserStorage.loadBlockSets = jest.fn(async() => Promise.resolve([])) as jest.Mock

		tabObserver = mocked(await TabObserver.create())

		mockLoadTab = new Observer<TabLoadedEvent>()
		tabObserver.subscribeTabLoaded = jest.fn((listener: Listener<TabLoadedEvent>) => {
			return mockLoadTab.subscribe(listener)
		}) as jest.Mock

		mockRemoveTab = new Observer<TabRemovedEvent>()
		tabObserver.subscribeTabRemoved = jest.fn((listener: Listener<TabRemovedEvent>) => {
			return mockRemoveTab.subscribe(listener)
		}) as jest.Mock

		mockedBlockTab = jest.spyOn(blockTab, "blockTab").mockImplementation((tabId: number) => {
			mockLoadTab.publish({ tabId, url: "block-page.html" })
		})

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

	const mockLoadTabs = (tabs: {tabId: number, active: boolean}[]) => {
		tabObserver.getActiveTabIds = jest.fn(() => 
			tabs.filter(({ active }) => active).map(({ tabId }) => tabId)) as jest.Mock
		for (const tab of tabs) {
			mockLoadTab.publish({ tabId: tab.tabId, url: "" })
		}
	}

	describe("update function updates block sets appropriately (only once)", () => {
		describe("when blockSet.annoyMode is false", () => {
			const timeAllowed = 2000
			describe("and blockSet.requireActive is false", () => {
				beforeEach(async() => {
					await initBlockSets([{ ra: false, am: false, ta: timeAllowed }])
				})

				it("existing non-active tabs increase blockSet.timeElapsed", () => {
					mockLoadTabs([
						{ tabId: 0, active: false },
						{ tabId: 1, active: false }])
					jest.advanceTimersByTime(updateInterval)
					expect(blockSets.list[0]!.timeElapsed).toBe(updateInterval)
					expect(mockedBlockTab).toBeCalledTimes(0)
				})
			
				it("existing active tabs increase blockSet.timeElapsed", () => {
					mockLoadTabs([
						{ tabId: 0, active: true },
						{ tabId: 1, active: true }])
					jest.advanceTimersByTime(updateInterval)
					expect(blockSets.list[0]!.timeElapsed).toBe(updateInterval)
					expect(mockedBlockTab).toBeCalledTimes(0)
				})
				
				it("existing non-active tabs get blocked when remaining time is zero", () => {
					mockLoadTabs([
						{ tabId: 0, active: false },
						{ tabId: 1, active: false }])
					jest.advanceTimersByTime(timeAllowed)
					expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed)
					expect(mockedBlockTab).toBeCalledWith(0)
					expect(mockedBlockTab).toBeCalledWith(1)
					expect(mockedBlockTab).toBeCalledTimes(2)
				})

				it("we don't get into a blocking loop after opening block tab", () => {				
					mockLoadTabs([
						{ tabId: 0, active: false },
						{ tabId: 1, active: false }])
					jest.advanceTimersByTime(timeAllowed)
					expect(mockedBlockTab).toBeCalledTimes(2)
					jest.advanceTimersByTime(updateInterval)
					expect(mockedBlockTab).toBeCalledTimes(2)
				})

				it("timeElapsed does not overflow", () => {	
					mockLoadTabs([
						{ tabId: 0, active: false },
						{ tabId: 1, active: false }])
					jest.advanceTimersByTime(timeAllowed + updateInterval)
					expect(blockSets.list[0]!.timeElapsed).toBe(timeAllowed)
				})

				it.todo("existing active tabs block page when remaining time is zero")
			})
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