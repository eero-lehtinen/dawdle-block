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

	// Holds internal state of windows
	// Main usage is holding active tab id and minimized-status
	private windowInfos: Record<number, WindowInfo> = {}

	// Holds internal state of tabs
	// Main usage is holding url
	private tabInfos: Record<number, TabInfo> = {}

	/**
	 * Returns tabs that are the current active tab in any window 
	 * and the window is not minimized.
	 */
	getActiveTabIds(): number[] {
		return Object.values(this.windowInfos)
			.filter(w => w.activeTabId !== null && w.minimized === false)
			.map(w => w.activeTabId as number)
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
		await tabManager.loadAllTabs()
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
			this.registerWindow(window.id, window.state)
			for (const tab of window.tabs ?? []) {
				this.registerTab(tab.id, tab.windowId, tab.url, tab.active)
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
	 * Can be used to update old window infos.
	 * @param window
	 */
	private registerWindow(windowId: number | undefined, 
		state: string | undefined): WindowInfo | null {
		if (!this.isValidWindowId(windowId)) return null
			
		const windowInfo: WindowInfo = { 
			id: windowId, 
			minimized: state === "minimized",
			activeTabId: this.windowInfos[windowId]?.activeTabId ?? null,
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
	 * Can be used to update old tab infos. Just set url undefined to leave it unchanged.
	 * Updates associated window's active tab if relevant.
	 * @param tabId id of tab
	 * @param windowId id of parent window
	 * @param url url of tab, set to undefined to preserve old value
	 * @param active is this tab the active tab of its window
	 * @returns null if register was unsuccessful (bc tabId or windowId were invalid)
	 */
	private registerTab(tabId: number| undefined, windowId: number | undefined,
		url: string | undefined, active: boolean): TabInfo | null {
		
		if (!this.isValidWindowId(windowId)) return null

		const windowInfo = this.windowInfos[windowId]
		if (!windowInfo) return null

		if (!this.isValidTabId(tabId)) return null
		
		const tabInfo: TabInfo = { 
			id: tabId, 
			url: url ?? this.tabInfos[tabId]?.url ?? null, 
			windowId: windowInfo.id, 
		}
		this.tabInfos = { ...this.tabInfos, [tabInfo.id]: tabInfo }
		
		if (active) {
			windowInfo.activeTabId = tabInfo.id
		}
		return tabInfo
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
	private onTabUpdated = (_tabId: number, 
		changeInfo: Tabs.OnUpdatedChangeInfoType, tab: Tabs.Tab) => {
		if (changeInfo?.status !== "complete") return

		const tabInfo = this.registerTab(tab.id, tab.windowId, tab.url, tab.active)

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
		this.registerTab(activeInfo.tabId, activeInfo.windowId, undefined, true)
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
			this.registerWindow(window.id, window.state)
		}
	}

	/**
	 * Event handler for window.onCreated.
	 * Registers the new window.
	 * @param window 
	 */
	private onWindowCreated(window: Windows.Window) {
		this.registerWindow(window.id, window.state)
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