import { Browser, Windows, Tabs } from "webextension-polyfill-ts"
import { deepMock } from "mockzilla"
import { mockEvent, MockzillaEventOf } from "mockzilla-webextension"

const [browser, mockBrowser, mockBrowserNode] = deepMock<Browser>("browser", false)

jest.mock("webextension-polyfill-ts", () => ({ browser }))

mockBrowser.tabs.TAB_ID_NONE.mock(-1)
mockBrowser.windows.WINDOW_ID_NONE.mock(-1)

import { Listener } from "../src/background/observer"
import { TabLoadedEvent, TabManager } from "../src/background/tabManager"

describe("test tabManager events", () => {
	let onUpdated: MockzillaEventOf<typeof mockBrowser.tabs.onUpdated>
	let tabManager: TabManager

	beforeEach(async() => {
		mockBrowserNode.enable()
		mockBrowser.tabs.onActivated.addListener.expect
		mockBrowser.tabs.onRemoved.addListener.expect
		mockBrowser.windows.onFocusChanged.addListener.expect
		mockBrowser.windows.onCreated.addListener.expect
		mockBrowser.windows.onRemoved.addListener.expect
		onUpdated = mockEvent(mockBrowser.tabs.onUpdated)

		mockBrowser.windows.getAll.expect
			.andResolve([{ id: 1, state: "normal",
				tabs: [
					{ id: 1, windowId: 1, active: true, url: "asd" }, 
					{ id: 2, windowId: 1, active: false }] } as Windows.Window])
		
		tabManager = await TabManager.create()
		
	})
	afterEach(() => mockBrowserNode.verifyAndDisable())

	it("can get a list of 'active' tab ids in minimal example", async() => {
		expect(tabManager.getActiveTabIds()).toStrictEqual([1])
	})

	it("can get a list of all tabs in minimal example", async() => {
		const tabs = tabManager.getTabs()
		expect(tabs).toContainEqual({ id: 1, windowId: 1, url: "asd" })
		expect(tabs).toContainEqual({ id: 2, windowId: 1, url: null })
	})

	it.todo("can get a list of 'active' tabs after multiple tab and window operations")

	it.todo("can get a list of all tabs tabs after multiple tab and window operations")

	it("can receive event when a tab has finished loading", async() => {
		const listener: Listener<TabLoadedEvent> = jest.fn()
		const unsubscribe = tabManager.onTabLoaded(listener)

		onUpdated.emit(1, { status: "loading" }, { id: 1, windowId: 1, url: undefined } as Tabs.Tab)
		expect(listener).toBeCalledTimes(0)
		
		onUpdated.emit(1, { status: "complete" }, { id: 1, windowId: 1, url: "url" } as Tabs.Tab)
		expect(listener).toBeCalledWith({ id: 1, url: "url" })

		unsubscribe()
	})
})