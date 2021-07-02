import { Browser, Windows, Tabs } from "webextension-polyfill-ts"
import { deepMock } from "mockzilla"
import { mockEvent, MockzillaEventOf } from "mockzilla-webextension"

const [browser, mockBrowser, mockBrowserNode] = deepMock<Browser>("browser", false)

jest.mock("webextension-polyfill-ts", () => ({ browser }))

mockBrowser.tabs.TAB_ID_NONE.mock(-1)
mockBrowser.windows.WINDOW_ID_NONE.mock(-1)

/** Makes sure than all async functions currently waiting for execution are executed now. */
const flushPromises = () => new Promise(setImmediate)

import { Listener } from "../src/background/observer"
import { TabLoadedEvent, TabObserver } from "../src/background/tabObserver"

describe("test tabObserver events", () => {
	let onUpdated: MockzillaEventOf<typeof mockBrowser.tabs.onUpdated>
	let onTabRemoved: MockzillaEventOf<typeof mockBrowser.tabs.onRemoved>
	let onActivated: MockzillaEventOf<typeof mockBrowser.tabs.onActivated>
	let onWindowRemoved: MockzillaEventOf<typeof mockBrowser.windows.onRemoved>
	let onWindowCreated: MockzillaEventOf<typeof mockBrowser.windows.onCreated>
	let onFocusChanged: MockzillaEventOf<typeof mockBrowser.windows.onFocusChanged>
	let tabObserver: TabObserver

	const initialActiveTabIds = [1]
	const initialTabs = [{ id: 1, windowId: 1, url: "asd" }, 
		{ id: 2, windowId: 1, url: null }]

	beforeEach(async() => {
		mockBrowserNode.enable()
		
		onUpdated = mockEvent(mockBrowser.tabs.onUpdated)
		onTabRemoved = mockEvent(mockBrowser.tabs.onRemoved)
		onActivated = mockEvent(mockBrowser.tabs.onActivated)
		onWindowRemoved = mockEvent(mockBrowser.windows.onRemoved)
		onWindowCreated = mockEvent(mockBrowser.windows.onCreated)
		onFocusChanged = mockEvent(mockBrowser.windows.onFocusChanged)
	
		mockBrowser.windows.getAll.expect
			.andResolve([{ id: 1, state: "normal",
				tabs: [
					{ id: 1, windowId: 1, active: true, url: "asd" }, 
					{ id: 2, windowId: 1, active: false }] } as Windows.Window])
		
		tabObserver = await TabObserver.create()
		
	})
	afterEach(() => mockBrowserNode.verifyAndDisable())

	it("can get a list of 'active' tab ids in minimal example", () => {
		expect(tabObserver.getActiveTabIds()).toStrictEqual(initialActiveTabIds)
	})

	it("can get a list of all tabs in minimal example", () => {
		expect(tabObserver.getTabs()).toStrictEqual(initialTabs)
	})

	it("tab gets removed when tabs.onRemoved event is fired", () => {
		onTabRemoved.emit(2, {} as Tabs.OnRemovedRemoveInfoType)
		expect(tabObserver.getTabs()).toHaveLength(1)
		expect(tabObserver.getTabs()).not.toContainEqual({ id: 2, windowId: 1, url: null })
	})

	it("after windows.onRemoved event is fired, its active tab is removed", () => {
		onWindowRemoved.emit(1)
		expect(tabObserver.getActiveTabIds()).toHaveLength(0)
	})

	it("a new tab on new window is registered after loading is complete", () => {
		onWindowCreated.emit({ id: 2, state: "normal" } as Windows.Window)
		onUpdated.emit(3, { status: "loading" }, { id: 3, windowId: 2, url: undefined } as Tabs.Tab)
		onUpdated.emit(3, { status: "complete" }, { id: 3, windowId: 2, url: "asd" } as Tabs.Tab)
		expect(tabObserver.getTabs()).toContainEqual({ id: 3, windowId: 2, url: "asd" })
	})

	it("active tab of window is no longer active, if window gets minimized", async() => {
		mockBrowser.windows.getAll.expect
			.andResolve([{ id: 1, state: "minimized" } as Windows.Window])

		onFocusChanged.emit(-1)
		await flushPromises()
		expect(tabObserver.getActiveTabIds()).toHaveLength(0)
	})

	it("after tabs.onActiveChanged event is fired, active tab changes", () => {
		onActivated.emit({ tabId: 2, windowId: 1 })
		expect(tabObserver.getActiveTabIds()).toStrictEqual([2])
	})

	it("can receive event when a tab has finished loading", () => {
		const listener: Listener<TabLoadedEvent> = jest.fn()
		const _unsubscribe = tabObserver.onTabLoaded(listener)

		onUpdated.emit(0, { status: "loading" }, { id: 1, windowId: 1, url: undefined } as Tabs.Tab)
		expect(listener).toBeCalledTimes(0)
		
		onUpdated.emit(0, { status: "complete" }, { id: 1, windowId: 1, url: "url" } as Tabs.Tab)
		expect(listener).toBeCalledWith({ id: 1, url: "url" })
	})

	describe("test invalid events", () => {

		afterEach(() => {
			expect(tabObserver.getTabs()).toStrictEqual(initialTabs)
			expect(tabObserver.getActiveTabIds()).toStrictEqual(initialActiveTabIds)
		})

		it("window creation with invalid ids does nothing", () => {
			onWindowCreated.emit({ id: -1, state: "normal" } as Windows.Window)
			onWindowCreated.emit({ id: undefined, state: "normal" } as Windows.Window)
		})

		it("window removal with invalid ids does nothing", () => {
			onWindowRemoved.emit(-1)
			onWindowRemoved.emit(100)
		})

		it("tab updating with invalid ids does nothing", () => {
			// invalid ids
			onUpdated.emit(0, { status: "complete" }, { id: -1, windowId: 1, url: "a" } as Tabs.Tab)
			onUpdated.emit(0, { status: "complete" }, { id: 1, windowId: -1, url: "a" } as Tabs.Tab)

			// nonexistant window id
			onUpdated.emit(0, { status: "complete" }, { id: 1, windowId: 100, url: "a" } as Tabs.Tab)
		})

		it("tab removal with invalid or nonexistant ids does nothing", () => {
			onTabRemoved.emit(-1, {} as Tabs.OnRemovedRemoveInfoType)
			onTabRemoved.emit(100, {} as Tabs.OnRemovedRemoveInfoType)
		})

		it("tab activation with invalid or nonexistant ids does nothing", () => {
			onActivated.emit({ tabId: -1, windowId: 1 })
			onActivated.emit({ tabId: 2, windowId: -1 })
			onActivated.emit({ tabId: 2, windowId: 100 })
		})
	})
})