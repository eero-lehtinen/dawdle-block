/**
 * @jest-environment jsdom
 */

import flushPromises from "flush-promises"
import { BrowserStorage } from "@src/background/browserStorage"
import { Background } from "@src/background/background"
import { insertMockBrowserStorageDefaults } from "../testHelpers/mockDefaults"

jest.mock("@src/background/background")
jest.mock("@src/background/blockSets")
jest.mock("@src/background/tabObserver")
jest.mock("webextension-polyfill-ts", () => ({}))
jest.mock("@src/background/browserStorage")
insertMockBrowserStorageDefaults(BrowserStorage.prototype)

describe("test background index", () => {
	test("should create Background object and insert it into window.background", async () => {
		await import("@src/background/index")
		await flushPromises()
		expect(window.background).toBeInstanceOf(Background)
	})
})
