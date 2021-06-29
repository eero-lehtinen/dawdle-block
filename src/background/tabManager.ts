import { browser, Tabs, Windows } from "webextension-polyfill-ts"
import { Observer, Listener } from "./observer"

export interface TabInfo {
	id: number
	url: string | null
	windowId: number | null
}

export interface TabLoadedEvent {
	id: number,
	url: string
}

export interface WindowInfo {
	id: number
	minimized: boolean
	activeTabId: number | null
}

const TAB_ID_NONE  = browser.tabs.TAB_ID_NONE
const WINDOW_ID_NONE = browser.windows.WINDOW_ID_NONE

export class TabManager {
	private windowInfos: Record<number, WindowInfo> = {}
	private tabInfos: Record<number, TabInfo> = {}

	getActiveTabIds(): number[] {
		return Object.values(this.windowInfos)
			.map(({ activeTabId }) => activeTabId)
			.filter((val): val is number => val !== null)
	}

	getTabs(): TabInfo[] {
		return Object.values(this.tabInfos)
	}

	private constructor() {}

	static async create(): Promise<TabManager> {
		const tabManager = new TabManager()
		tabManager.subscribeToAllEvents()
		tabManager.loadAllTabs()
		return tabManager
	}

	private subscribeToAllEvents() {
		try {
			// Try first if browser allows filters (FireFox onUpdated event is fired on all 
			// changes, so we need to filter only status changes).
			const filter: Tabs.UpdateFilter = { properties: ["status"] }
			browser.tabs.onUpdated.addListener(this.onTabUpdated.bind(this), filter)
		}
		catch {
			// If filters aren't allowed, then behaviour is just as we want, only firing on status changes
			browser.tabs.onUpdated.addListener(this.onTabUpdated.bind(this))
		}
		browser.tabs.onActivated.addListener(this.onTabActivated.bind(this))
		browser.tabs.onRemoved.addListener(this.onTabRemoved.bind(this))
		browser.windows.onFocusChanged.addListener(this.onWindowFocusChanged.bind(this))
		browser.windows.onCreated.addListener(this.onWindowCreated.bind(this))
		browser.windows.onRemoved.addListener(this.onWindowRemoved.bind(this))
	}

	private async loadAllTabs() {
		const windows = await browser.windows.getAll({ populate: true })
		for (const window of windows) {
			this.registerWindow(window)
			for (const tab of window.tabs ?? []) {
				this.registerTab(tab)
			}
		}
	}

	private isValidWindowId(windowId: number | undefined): windowId is number {
		return windowId !== undefined && windowId !== WINDOW_ID_NONE
	}
	
	private isValidTabId(tabId: number | undefined): tabId is number {
		return tabId !== undefined && tabId !== TAB_ID_NONE
	}

	private registerWindow(window: Windows.Window): WindowInfo | null {
		if (!this.isValidWindowId(window.id)) return null

		const windowInfo = { 
			id: window.id, 
			minimized: window.state === "minimized", 
			activeTabId: null, 
			tabIds: [], 
		}
		this.windowInfos = { ...this.windowInfos, [windowInfo.id]: windowInfo }
		return windowInfo
	}

	private unregisterWindow(windowId: number | undefined) {
		if (this.isValidWindowId(windowId) && this.windowInfos[windowId]) {
			delete this.windowInfos[windowId]
		}
	}

	private registerTab(tab: Tabs.Tab): TabInfo | null {
		if (!this.isValidWindowId(tab.windowId)) return null

		const windowInfo = this.windowInfos[tab.windowId]
		if (!windowInfo) return null

		if (!this.isValidTabId(tab.id)) return null
		const newTab = { id: tab.id, url: tab.url ?? null, windowId: windowInfo.id }
		this.tabInfos = { ...this.tabInfos, [newTab.id]: newTab }
		if (tab.active) {
			windowInfo.activeTabId = newTab.id
		}
		return newTab
	}

	private unregisterTab(tabId: number | undefined) {
		if (this.isValidTabId(tabId) && this.tabInfos[tabId]) {
			delete this.tabInfos[tabId]
		}
	}

	private onTabUpdated = (tabId: number, 
		changeInfo: Tabs.OnUpdatedChangeInfoType, tab: Tabs.Tab) => {
		if (changeInfo?.status !== "complete") return

		let tabInfo = this.tabInfos[tabId] ?? null
		// If exits already, update its values
		if (tabInfo) {
			tabInfo.url = tab.url ?? null
			if (tab.windowId !== undefined && this.windowInfos[tab.windowId])
				tabInfo.windowId = tab.windowId
		}
		// else just create a new one
		else {
			tabInfo = this.registerTab(tab)
		}

		// Publish results to listeners only we actually found an url in a valid tab
		if (tabInfo && tabInfo.url !== null) 
			this.tabLoadedObserver.publish({ id: tabInfo.id, url: tabInfo.url })
	}

	private onTabActivated = (activeInfo: Tabs.OnActivatedActiveInfoType) => {
		const windowInfo = this.windowInfos[activeInfo.windowId]
		if (!windowInfo) return
		windowInfo.activeTabId = activeInfo.tabId

		const tabInfo = this.tabInfos[activeInfo.tabId]
		if (tabInfo) 
			tabInfo.windowId = activeInfo.windowId
	}

	private onTabRemoved = (tabId: number, _removeInfo: Tabs.OnRemovedRemoveInfoType) => {
		this.unregisterTab(tabId)
	}
	
	private onWindowFocusChanged = async(_windowId: number) => {
		const windows = await browser.windows.getAll()

		for (const window of windows) {
			const windowInfo = this.windowInfos[window.id ?? -1] ?? this.registerWindow(window)
			if (windowInfo) {
				windowInfo.minimized = window.state === "minimized"
			}
		}
	}

	private onWindowCreated(window: Windows.Window) {
		this.registerWindow(window)
	}

	private onWindowRemoved(windowId: number) {
		this.unregisterWindow(windowId)
	}

	private tabLoadedObserver = new Observer<TabLoadedEvent>()

	onTabLoaded(listener: Listener<TabLoadedEvent>): () => void {
		return this.tabLoadedObserver.subscribe(listener)
	}
}