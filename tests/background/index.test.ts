/**
 * @jest-environment jsdom
 */

import flushPromises from "flush-promises"
import { BrowserStorage } from "@src/background/browserStorage"
import { ok } from "neverthrow"
import { createDefaultGeneralOptionsData } from "@src/background/generalOptionsParser"
import { mocked } from "ts-jest/utils"
import { Background } from "@src/background/background"

const mockBrowserStorage = mocked(BrowserStorage, true)
mockBrowserStorage.prototype.fetchGeneralOptionsData
	.mockResolvedValue(ok(createDefaultGeneralOptionsData()))

jest.mock("@src/background/background")
jest.mock("@src/background/blockSets")
jest.mock("@src/background/tabObserver")
jest.mock("webextension-polyfill-ts", () => ({}))
jest.mock("@src/background/browserStorage")

import "@src/background/index"

describe("test background index", () => {
	test("should create Background object and insert it into window.background", async() => {
		await flushPromises()
		expect(window.background).toBeInstanceOf(Background)
	})
})

