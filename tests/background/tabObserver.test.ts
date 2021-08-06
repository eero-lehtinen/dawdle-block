import flushPromises from "flush-promises"
import { mockEvent, clearMockEventListeners } from "../testHelpers/mockEvent"
import { browser, Tabs, Windows } from "webextension-polyfill-ts"
import { TabLoadedEvent, TabObserver, TabRemovedEvent } from "@src/background/tabObserver"
import { mocked } from "ts-jest/utils"
import { Listener } from "@src/background/observer"

jest.mock("webextension-polyfill-ts", () => {
	return {
		browser: {
			tabs: {
				TAB_ID_NONE: -1,
				onUpdated: jest.fn(),
				onActivated: jest.fn(),
				onRemoved: jest.fn(),
			},
			windows: {
				WINDOW_ID_NONE: -1,
				getAll: jest.fn(),
				onFocusChanged: jest.fn(),
				onCreated: jest.fn(),
				onRemoved: jest.fn(),
			},
		},
	}
})

const mockBrowser = mocked(browser, true)

const emitTabUpdated = mockEvent(mockBrowser.tabs.onUpdated)
const emitTabActivated = mockEvent(mockBrowser.tabs.onActivated)
const emitTabRemoved = mockEvent(mockBrowser.tabs.onRemoved)
const emitWindowFocusChanged = mockEvent(mockBrowser.windows.onFocusChanged)
const emitWindowCreated = mockEvent(mockBrowser.windows.onCreated)
const emitWindowRemoved = mockEvent(mockBrowser.windows.onRemoved)

afterEach(() => {
	clearMockEventListeners()
	jest.clearAllMocks()
})

describe("test tabObserver events", () => {
	let tabObserver: TabObserver

	const initialActiveTabIds = [1]
	const initialTabs = [
		{ id: 1, windowId: 1, url: "asd" },
		{ id: 2, windowId: 1, url: null },
	]

	beforeEach(async () => {
		mockBrowser.windows.getAll.mockImplementation(() =>
			Promise.resolve([
				{
					id: 1,
					state: "normal",
					tabs: [
						{ id: 1, windowId: 1, active: true, url: "asd" },
						{ id: 2, windowId: 1, active: false },
					],
				},
			] as Windows.Window[])
		)

		tabObserver = await TabObserver.create()
	})
	afterEach(() => jest.clearAllMocks())

	test("can get a list of 'active' tab ids in minimal example", () => {
		expect(tabObserver.getActiveTabIds()).toStrictEqual(initialActiveTabIds)
	})

	test("can get a list of all tabs in minimal example", () => {
		expect(tabObserver.getTabs()).toStrictEqual(initialTabs)
	})

	test("tab gets removed when tabs.onRemoved event is fired", () => {
		emitTabRemoved(2, {} as Tabs.OnRemovedRemoveInfoType)
		expect(tabObserver.getTabs()).toHaveLength(1)
		expect(tabObserver.getTabs()).not.toContainEqual({ id: 2, windowId: 1, url: null })
	})

	test("after windows.onRemoved event is fired, its active tab is removed", () => {
		emitWindowRemoved(1)
		expect(tabObserver.getActiveTabIds()).toHaveLength(0)
	})

	test("a new tab on new window is registered after loading is complete", () => {
		emitWindowCreated({ id: 2, state: "normal" } as Windows.Window)
		emitTabUpdated(3, { status: "loading" }, {
			id: 3,
			windowId: 2,
			url: undefined,
		} as Tabs.Tab)
		emitTabUpdated(3, { status: "complete" }, {
			id: 3,
			windowId: 2,
			url: "asd",
		} as Tabs.Tab)
		expect(tabObserver.getTabs()).toContainEqual({ id: 3, windowId: 2, url: "asd" })
	})

	test("active tab of window is no longer active, if window gets minimized", async () => {
		mockBrowser.windows.getAll.mockImplementation(() =>
			Promise.resolve([{ id: 1, state: "minimized" } as Windows.Window])
		)

		emitWindowFocusChanged(-1)
		await flushPromises()
		expect(tabObserver.getActiveTabIds()).toHaveLength(0)
	})

	test("after tabs.onActiveChanged event is fired, active tab changes", () => {
		emitTabActivated({ tabId: 2, windowId: 1 })
		expect(tabObserver.getActiveTabIds()).toStrictEqual([2])
	})

	test("can receive event when a tab has finished loading", () => {
		const listener: Listener<TabLoadedEvent> = jest.fn()
		const _unsubscribe = tabObserver.subscribeTabLoaded(listener)

		emitTabUpdated(0, { status: "loading" }, {
			id: 1,
			windowId: 1,
			url: undefined,
		} as Tabs.Tab)
		expect(listener).toBeCalledTimes(0)

		emitTabUpdated(0, { status: "complete" }, {
			id: 1,
			windowId: 1,
			url: "url",
		} as Tabs.Tab)
		expect(listener).toBeCalledWith({ tabId: 1, url: "url" })
	})

	test("can receive event when a tab is removed", () => {
		const listener: Listener<TabRemovedEvent> = jest.fn()
		const _unsubscribe = tabObserver.subscribeTabRemoved(listener)

		emitTabRemoved(0, {} as Tabs.OnRemovedRemoveInfoType)
		expect(listener).toBeCalledTimes(1)
		expect(listener).toBeCalledWith({ tabId: 0 })
	})

	describe("test invalid events", () => {
		const expectToBeUnchanged = (tabObserver: TabObserver) => {
			expect(tabObserver.getTabs()).toStrictEqual(initialTabs)
			expect(tabObserver.getActiveTabIds()).toStrictEqual(initialActiveTabIds)
		}

		test("window creation with invalid ids does nothing", () => {
			emitWindowCreated({ id: -1, state: "normal" } as Windows.Window)
			emitWindowCreated({ id: undefined, state: "normal" } as Windows.Window)
			expectToBeUnchanged(tabObserver)
		})

		test("window removal with invalid ids does nothing", () => {
			emitWindowRemoved(-1)
			emitWindowRemoved(100)
			expectToBeUnchanged(tabObserver)
		})

		test("tab updating with invalid ids does nothing", () => {
			// invalid ids
			emitTabUpdated(0, { status: "complete" }, {
				id: -1,
				windowId: 1,
				url: "a",
			} as Tabs.Tab)
			emitTabUpdated(0, { status: "complete" }, {
				id: 1,
				windowId: -1,
				url: "a",
			} as Tabs.Tab)
			// nonexistant window id
			emitTabUpdated(0, { status: "complete" }, {
				id: 1,
				windowId: 100,
				url: "a",
			} as Tabs.Tab)

			expectToBeUnchanged(tabObserver)
		})

		test("tab removal with invalid or nonexistant ids does nothing", () => {
			emitTabRemoved(-1, {} as Tabs.OnRemovedRemoveInfoType)
			emitTabRemoved(100, {} as Tabs.OnRemovedRemoveInfoType)
			expectToBeUnchanged(tabObserver)
		})

		test("tab activation with invalid or nonexistant ids does nothing", () => {
			emitTabActivated({ tabId: -1, windowId: 1 })
			emitTabActivated({ tabId: 2, windowId: -1 })
			emitTabActivated({ tabId: 2, windowId: 100 })
			expectToBeUnchanged(tabObserver)
		})
	})
})
