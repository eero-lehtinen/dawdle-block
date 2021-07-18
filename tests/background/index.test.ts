/**
 * @jest-environment jsdom
 */

import flushPromises from "flush-promises"

jest.mock("@src/background/background")
jest.mock("@src/background/blockSets")
jest.mock("@src/background/browserStorage")
jest.mock("@src/background/tabObserver")
jest.mock("webextension-polyfill-ts", () => ({}))

import { Background } from "@src/background/background"

import "@src/background/index"

describe("test background index", () => {
	it("should create Background object and insert it into window.background", async() => {
		await flushPromises()
		expect(window.background).toBeInstanceOf(Background)
	})
})

