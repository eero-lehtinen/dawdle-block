import { Background } from "@src/background/background"
import { BlockSets } from "@src/background/blockSets"
import { BrowserStorage } from "@src/background/browserStorage"
import { TabObserver } from "@src/background/tabObserver"

jest.mock("@src/background/tabObserver")
jest.mock("@src/background/blockSets")
jest.mock("@src/background/browserStorage")

describe("test Background", () => {
	let browserStorage: BrowserStorage
	let tabObserver: TabObserver
	let blockSets: BlockSets
	let _background: Background
	beforeEach(async() => {
		browserStorage = new BrowserStorage({ preferSync: true })
		tabObserver = await TabObserver.create()
		blockSets = await BlockSets.create(browserStorage)
		_background = new Background(browserStorage, tabObserver, blockSets)
	})

	it.todo("increments time elapsed on blockset every second, when blacklisted tab is loaded")

	// Block set may be configured to be disabled on certain week days, 
	// e.g. off on weekends and on other days.
	// Blocking needs to be reevaluated when disabled status changes.
	it.todo("updates all tabs when active day may have changed")

	// Block set may be configured to be disabled e.g. from 8 pm to 12 am.
	// Blocking needs to be reevaluated when disabled status changes.
	it.todo("updates all tabs when active time may have changed")
})