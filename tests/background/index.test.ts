/**
 * @jest-environment jsdom
 */

import flushPromises from "flush-promises"
import { mocked } from "ts-jest/utils"
import { Background } from "@src/background/background"

jest.mock("@src/background/background")
jest.mock("@src/background/blockSets")
jest.mock("@src/background/tabObserver")

const backgroundMock = mocked(Background)

import "@src/background/index"


describe("test background index", () => {
	it("should create Background object and insert it into window.background", async() => {
		await flushPromises()
		expect(backgroundMock).toBeCalledTimes(1)
		expect(window.background).toBeInstanceOf(Background)
	})
})

