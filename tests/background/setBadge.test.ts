import { browser } from "webextension-polyfill-ts"
import ms from "ms.macro"
import { mocked } from "ts-jest/utils"

jest.mock("webextension-polyfill-ts", () => {
	return {
		browser: {
			browserAction: {
				setBadgeText: jest.fn(),
				setBadgeBackgroundColor: jest.fn(),
			},
		},
	}
})

const mockSetBadgeText = mocked(browser.browserAction.setBadgeText)
const mockSetBadgeBackgroundColor = mocked(browser.browserAction.setBadgeBackgroundColor)

import { setBadge, grey, orange, red } from "@src/background/setBadge"

afterEach(() => jest.clearAllMocks())

describe("test setBadge", () => {
	test("sets badge empty if input is Infinity", async() => {
		await setBadge(Infinity)
		expect(mockSetBadgeText).toBeCalledWith({ text: "" })
		expect(mockSetBadgeBackgroundColor).toBeCalledTimes(0)
	})

	test("sets badge to grey empty box with input of more than one hour", async() => {
		await setBadge(ms("61min"))
		await setBadge(ms("10d"))
		expect(mockSetBadgeText.mock.calls).toEqual([
			[{ text: " " }], 
			[{ text: " " }]])
		expect(mockSetBadgeBackgroundColor.mock.calls).toEqual([
			[{ color: grey }], 
			[{ color: grey }]])
	})

	test("sets badge to orange box with minutes if (1min < input <= 60min)", async() => {
		await setBadge(ms("60min"))
		await setBadge(ms("10.1min"))
		await setBadge(ms("61s"))
		expect(mockSetBadgeText.mock.calls).toEqual([
			[{ text: "60" }], 
			[{ text: "10" }],
			[{ text: "1" }]])
		expect(mockSetBadgeBackgroundColor.mock.calls).toEqual([
			[{ color: orange }], 
			[{ color: orange }],
			[{ color: orange }]])
	})

	test("sets badge to red box with seconds if (0sec <= input <= 1min)", async() => {
		await setBadge(ms("1min"))
		await setBadge(ms("10.1s"))
		await setBadge(0)
		expect(mockSetBadgeText.mock.calls).toEqual([
			[{ text: "60" }], 
			[{ text: "10" }],
			[{ text: "0" }]])
		expect(mockSetBadgeBackgroundColor.mock.calls).toEqual([
			[{ color: red }], 
			[{ color: red }],
			[{ color: red }]])
	})

	test("sets badge to red box with exclamation marks input is negative", async() => {
		await setBadge(ms("-1ms"))
		await setBadge(ms("-1year"))
		expect(mockSetBadgeText.mock.calls).toEqual([
			[{ text: "!!" }], 
			[{ text: "!!" }]])
		expect(mockSetBadgeBackgroundColor.mock.calls).toEqual([
			[{ color: red }],
			[{ color: red }]])
	})
})