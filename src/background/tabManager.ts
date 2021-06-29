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

/**
 * Maintains up to date information about all tabs in browser.
 * Listeners can be registered to listen for relevant events (e.g. tab finishing loading).
 * Active tabs can be queried at any time.
 */
export class TabManager {
	private windowInfos: Record<number, WindowInfo> = {}
	private tabInfos: Record<number, TabInfo> = {}

	/**
	 * Returns tabs that are the current active tab in any window 
	 * and the window is not minimized.
	 */
	getActiveTabIds(): number[] {
		return Object.values(this.windowInfos)
			.map(({ activeTabId }) => activeTabId)
			.filter((val): val is number => val !== null)
	}

	/**
	 * Returns a list of all tabs.
	 */
	getTabs(): TabInfo[] {
		return Object.values(this.tabInfos)
	}

	private constructor() {}

	/**
	 * Initializes TabManager for usage and returns it.
	 */
	static async create(): Promise<TabManager> {
		const tabManager = new TabManager()
		tabManager.subscribeToAllEvents()
		tabManager.loadAllTabs()
		return tabManager
	}

	/**
	 * Subscribes to all relevant browser events.
	 */
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

	/**
	 * Registers all windows and tabs from the browser.
	 */
	private async loadAllTabs() {
		const windows = await browser.windows.getAll({ populate: true })
		for (const window of windows) {
			this.registerWindow(window)
			for (const tab of window.tabs ?? []) {
				this.registerTab(tab)
			}
		}
	}

	/**
	 * Checks if this windowId is valid. (defined and not explicit none)
	 * @param windowId 
	 */
	private isValidWindowId(windowId: number | undefined): windowId is number {
		return windowId !== undefined && windowId !== WINDOW_ID_NONE
	}
	
	/**
	 * Checks if this tabId is valid. (defined and not explicit none)
	 * @param tabId 
	 */
	private isValidTabId(tabId: number | undefined): tabId is number {
		return tabId !== undefined && tabId !== TAB_ID_NONE
	}

	/**
	 * Registers window to internal state if it's valid.
	 * @param window
	 */
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

	/**
	 * Removes window with windowId from internal state if window exists and is valid.
	 * @param windowId 
	 */
	private unregisterWindow(windowId: number | undefined) {
		if (this.isValidWindowId(windowId) && this.windowInfos[windowId]) {
			delete this.windowInfos[windowId]
		}
	}

	/**
	 * Registers tab to internal state if it's valid.
	 * Updates associated window's active tab if relevant.
	 * @param tab
	 */
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

	
	/**
	 * Removes window with windowId from internal state if window exists and is valid.
	 * @param windowId 
	 */
	private unregisterTab(tabId: number | undefined) {
		if (this.isValidTabId(tabId) && this.tabInfos[tabId]) {
			delete this.tabInfos[tabId]
		}
	}

	/**
	 * Event handler for tabs.onUpdated.
	 * Registers tab if it isn't accounted for.
	 * Notifies listeners if tab has completed loading.
	 * @param tabId 
	 * @param changeInfo 
	 * @param tab 
	 */
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

	/**
	 * Event handler for tab.onActivated.
	 * Changes activeTabId of window if relevant.
	 * @param activeInfo 
	 */
	private onTabActivated = (activeInfo: Tabs.OnActivatedActiveInfoType) => {
		const windowInfo = this.windowInfos[activeInfo.windowId]
		if (!windowInfo) return
		windowInfo.activeTabId = activeInfo.tabId

		const tabInfo = this.tabInfos[activeInfo.tabId]
		if (tabInfo) 
			tabInfo.windowId = activeInfo.windowId
	}

	
	/**
	 * Event handler for tab.onRemoved.
	 * Unregisters tab.
	 * @param activeInfo 
	 */
	private onTabRemoved = (tabId: number, _removeInfo: Tabs.OnRemovedRemoveInfoType) => {
		this.unregisterTab(tabId)
	}
	
	/**
	 * Event handler for window.onFocusChanged.
	 * This gets fired when user minimizes window (among other focus changes),
	 * so we need to check if any window has been minimized.
	 * @param _windowId 
	 */
	private onWindowFocusChanged = async(_windowId: number) => {
		const windows = await browser.windows.getAll()

		for (const window of windows) {
			const windowInfo = this.windowInfos[window.id ?? -1] ?? this.registerWindow(window)
			if (windowInfo) {
				windowInfo.minimized = window.state === "minimized"
			}
		}
	}

	/**
	 * Event handler for window.onCreated.
	 * Registers the new window.
	 * @param window 
	 */
	private onWindowCreated(window: Windows.Window) {
		this.registerWindow(window)
	}

	/**
	 * Event handler for window.onRemoved.
	 * Unregisters the window.
	 * @param windowId 
	 */
	private onWindowRemoved(windowId: number) {
		this.unregisterWindow(windowId)
	}

	private tabLoadedObserver = new Observer<TabLoadedEvent>()

	/**
	 * Registers listener for TabLoadedEvent.
	 * @param listener 
	 * @returns unsubscribe function
	 */
	onTabLoaded(listener: Listener<TabLoadedEvent>): () => void {
		return this.tabLoadedObserver.subscribe(listener)
	}
}