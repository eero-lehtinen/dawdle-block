/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
const mockWindow = window

jest.mock("webextension-polyfill-ts", () => (
	{ browser: { runtime: {
		getBackgroundPage: () => mockWindow,
	} } }))
jest.mock("@src/background/tabObserver")
jest.mock("@src/background/browserStorage")
jest.mock("@src/background/youtubeAPI")
jest.mock("@src/background/annoyTab")
jest.mock("@src/background/blockTab")
jest.mock("@src/background/setBadge")

import BGScriptProvider from "@src/shared/BGScriptProvider"
import { render, screen } from "@testing-library/preact"
import NavDrawer from "@src/options/NavDrawer"
import "@testing-library/jest-dom"
import { BrowserStorage } from "@src/background/browserStorage"
import { Background } from "@src/background/background"
import { TabObserver } from "@src/background/tabObserver"
import { BlockSets } from "@src/background/blockSets"
import { GeneralOptions } from "@src/background/generalOptions"
import { MemoryRouter } from "react-router-dom"
import userEvent from "@testing-library/user-event"
import { insertMockBrowserStorageDefaults } from "../testHelpers/mockDefaults"

insertMockBrowserStorageDefaults(BrowserStorage.prototype)

TabObserver.prototype.subscribeTabLoaded = jest.fn()
TabObserver.prototype.subscribeTabRemoved = jest.fn()
TabObserver.prototype.getActiveTabIds = jest.fn().mockReturnValue([])

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

/** NavDrawer wrapped with elements required for testing */
const TestNavDrawer = () =>
	<BGScriptProvider><MemoryRouter>
		<NavDrawer />
	</MemoryRouter></BGScriptProvider>


describe("test options NavDrawer", () => {
	const expectBlockSetListNames = (names: string[]) => {
		const listItems = screen.getAllByRole("listitem")
		let i = listItems.findIndex(elem => 
			elem !== null && elem.textContent?.includes("BLOCK SETS")) + 1
		for (const name of names)
			expect(listItems[i++]).toHaveTextContent(name)
	}

	test("shows list of current block sets in order", async() => {
		await background.blockSets.addDefaultBlockSet()
		await background.blockSets.addDefaultBlockSet()
		
		render(<TestNavDrawer />)

		await screen.findByRole("list")
		expectBlockSetListNames(background.blockSets.list.map(blockSet => blockSet.name))
	})

	test("can add new block sets with button", async() => {
		render(<TestNavDrawer />)

		await screen.findByRole("list")

		userEvent.click(screen.getByText("Add New Block Set"))
		await expect(screen.findByText("Block Set 2")).toResolve()
		expectBlockSetListNames(["Block Set 1", "Block Set 2"])
	})
})