/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
const mockWindow = window

jest.mock("webextension-polyfill-ts", () => (
	{ 
		browser: {
			runtime: {
				getBackgroundPage: () => mockWindow,
			},
		},
	}))
jest.mock("@src/background/tabObserver")
jest.mock("@src/background/browserStorage")

import BGScriptProvider from "@src/shared/BGScriptProvider"
import { render, screen } from "@testing-library/preact"
import NavDrawer from "@src/options/NavDrawer"
import "@testing-library/jest-dom"
import { mocked } from "ts-jest/utils"
import { BrowserStorage, StorageSetSuccess } from "@src/background/browserStorage"
import { createDefaultGeneralOptionsData } from "@src/background/generalOptionsParser"
import { okAsync } from "neverthrow"
import { Background } from "@src/background/background"
import { TabLoadedEvent, TabObserver, TabRemovedEvent } from "@src/background/tabObserver"
import { BlockSets } from "@src/background/blockSets"
import { GeneralOptions } from "@src/background/generalOptions"
import { MemoryRouter } from "react-router-dom"
import { Listener, Observer } from "@src/background/observer"

const mockBrowserStorage = mocked(BrowserStorage, true)
mockBrowserStorage.prototype.fetchBlockSets.mockResolvedValue([])
mockBrowserStorage.prototype.saveNewBlockSet.mockReturnValue(okAsync(StorageSetSuccess.Completed))
mockBrowserStorage.prototype.deleteBlockSet.mockReturnValue(okAsync(StorageSetSuccess.Completed))
mockBrowserStorage.prototype.fetchGeneralOptionsData
	.mockReturnValue(okAsync(createDefaultGeneralOptionsData()))

const mockLoadTab = new Observer<TabLoadedEvent>()
TabObserver.prototype.subscribeTabLoaded = jest.fn((listener: Listener<TabLoadedEvent>) => 
	mockLoadTab.subscribe(listener))

const mockRemoveTab = new Observer<TabRemovedEvent>()
TabObserver.prototype.subscribeTabRemoved = jest.fn((listener: Listener<TabRemovedEvent>) => 
	mockRemoveTab.subscribe(listener)) 

let background: Background

beforeEach(async() => {
	const browserStorage = new BrowserStorage({ preferSync: true })
	background = new Background({
		browserStorage,
		tabObserver: await TabObserver.create(), 
		blockSets: await BlockSets.create(browserStorage),
		generalOptions: await GeneralOptions.create(browserStorage),
	})
	mockWindow.background = background
})


describe("test options NavDrawer", () => {
	test("shows list of current block sets in order", async() => {
		await background.blockSets.addDefaultBlockSet()
		await background.blockSets.addDefaultBlockSet()
		
		render(<BGScriptProvider><MemoryRouter><NavDrawer /></MemoryRouter></BGScriptProvider>)

		await screen.findByRole("list")

		const listItems = screen.getAllByRole("listitem")
		let i = listItems.findIndex(elem => 
			elem !== null && elem.textContent?.includes("BLOCK SETS")) + 1
		
		for (const blockSet of background.blockSets.list) {
			expect(listItems[i++]).toHaveTextContent(blockSet.name)
		}
	})
	test.todo("can add new block sets")
})