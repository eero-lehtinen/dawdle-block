import { mocked } from "ts-jest/utils"
import { BlockSet, BlockTestRes, ListType } from "@src/background/blockSet"
import { BlockSetData } from "@src/background/blockSetParser"
import { timeToMSSinceMidnight } from "@src/shared/utils"
import ms from "ms.macro"

// Mock needed for a single test
import{ fetchChannelTitle, FetchError } from "@src/background/youtubeAPI"
import { ChangedEvent } from "@src/background/observer"
import { err } from "neverthrow"
jest.mock("@src/background/youtubeAPI")
const mockedFetchChannelTitle = mocked(fetchChannelTitle)

describe("test BlockSet construction parameters", () => {
	const defaultBlockSetData = new BlockSet(0).data

	test("non-objects throw", () => {
		jest.spyOn(console, "error").mockImplementation(() => {/*do nothing*/})
		expect(() => new BlockSet(0, "string")).toThrow()
		expect(() => new BlockSet(0, 42)).toThrow()
		expect(() => new BlockSet(0, () => {return 0})).toThrow()
		expect(() => new BlockSet(0, [])).toThrow()
		expect(() => new BlockSet(0, null)).toThrow()
	})

	test("objects with members of invalid types throw", () => {
		const testBlockSetObj = {
			v: 1,
			requireActive: "string", 
			activeDays: undefined,
		}

		expect(() => { new BlockSet(0, testBlockSetObj)}).toThrow()
	})

	test("incomplete objects get filled with defaults", () => {
		expect(new BlockSet(0, {}).data).toStrictEqual(defaultBlockSetData)
	})

	test("undefined creates a default block set", () => {
		expect(new BlockSet(0, undefined).data).toStrictEqual(defaultBlockSetData)
		expect(new BlockSet(0).data).toStrictEqual(defaultBlockSetData)
	})

	test("objects retain their valid property names and lose invalid ones", () => {
		const testBlockSetObj = {
			v: 1,
			name: "retained", 
			loseMe: "lost",
		}

		const blockSetData = new BlockSet(0, testBlockSetObj).data

		expect(blockSetData).toHaveProperty("name")
		expect(blockSetData).not.toHaveProperty("loseMe")
	})

	test("V0 block sets get converted to V1", () => {
		const listV0 = [
			{ type: "urlEquals", value: "test" },
			{ type: "urlContains", value: "test" },
			{ type: "urlPrefix", value: "test" },
			{ type: "urlSuffix", value: "test" },
			{ type: "urlRegexp", value: "test" },
			{ type: "ytChannel", value: { id: "channelid", name: "testchannel" } },
			{ type: "ytCategory", value: { id: "42", name: "testcategory" } },
		]
		const listV1Expected = {
			urlPatterns: [
				"test",
				"*test*",
				"test*",
				"*test",
			],
			urlRegExps: [
				"test",
			],
			ytChannels: [
				{ id: "channelid", title: "testchannel" },
			],
			ytCategoryIds: [
				"42",
			],
		}

		const testBlockSetObj = {
			blacklist: listV0,
			whitelist: listV0,
		}
		const testBlockSetObjExpected: BlockSetData = {
			...defaultBlockSetData,
			blacklist: listV1Expected,
			whitelist: listV1Expected,
		}

		expect(new BlockSet(0, testBlockSetObj).data).toStrictEqual(testBlockSetObjExpected)
	})

	test("V0 \"*\"-characters get escaped when converting to V1", () => {
		const listV0 = [
			{ type: "urlEquals", value: "*te*st*" },
			{ type: "urlContains", value: "*te*st*" },
		]
		const listV1Expected = {
			urlPatterns: [
				String.raw`\*te\*st\*`,
				String.raw`*\*te\*st\**`,
			],
			urlRegExps: [],
			ytChannels: [],
			ytCategoryIds: [],
		}

		const testBlockSetObj = {
			blacklist: listV0,
			whitelist: listV0,
		}

		const testBlockSetObjExpected = {
			...defaultBlockSetData,
			blacklist: listV1Expected,
			whitelist: listV1Expected,
		}

		expect(new BlockSet(0, testBlockSetObj).data).toStrictEqual(testBlockSetObjExpected)
	})
})

describe("test BlockSet methods", () => {

	const expectIsInActiveTimes = (blockSet: BlockSet, 
		dateResultPairs: Array<{date: Date, result: boolean}>) => {
		for (const { date, result } of dateResultPairs) {
			expect(blockSet.isInActiveTime(timeToMSSinceMidnight(date))).toBe(result)
		}
	}
	

	test("isInActiveTime returns always true, if activeTime from and to are the same", () => {
		const blockSet = new BlockSet(0, { activeTime: { from: 0, to: 0 } })
		const dateResultPairs = [
			{ date: new Date(0), result: true },
			{ date: new Date(42), result: true },
			{ date: new Date(), result: true },
		]
		expectIsInActiveTimes(blockSet, dateResultPairs)
	})

	test("isInActiveTime returns true, if today's time is between from and to", () => {
		const blockSet = new BlockSet(0, { activeTime: { from: 0, to: ms`1h` } })
		const dateResultPairs = [
			{ date: new Date("2000-01-01T00:00:00"), result: false },
			{ date: new Date("2000-01-01T00:30:00"), result: true },
			{ date: new Date("2000-01-01T01:00:00"), result: false },
			{ date: new Date("2000-01-01T06:00:00"), result: false },
		]
		expectIsInActiveTimes(blockSet, dateResultPairs)
	})

	test("if to is less than from, calculation of being in between wraps around " + 
	"midnight instead", () => {
		const blockSet = new BlockSet(0, { activeTime: { from: ms`1h`, to: 0 } })
		const dateResultPairs = [
			{ date: new Date("2000-01-01T00:00:00"), result: false },
			{ date: new Date("2000-01-01T00:30:00"), result: false },
			{ date: new Date("2000-01-01T01:00:00"), result: false },
			{ date: new Date("2000-01-01T06:00:00"), result: true },
		]
		expectIsInActiveTimes(blockSet, dateResultPairs)
	})


	test("active weekday detection returns values of activeDays for values between 0 and 6", () => {
		const activeDays = [false, true, false, false, true, false, false]
		const blockSet = new BlockSet(0, { activeDays })
		for (let i = 0; i < activeDays.length; i++) {
			expect(blockSet.isInActiveWeekday(i)).toBe(activeDays[i])
		}
	})

	test("active weekday detection returns false for all numbers that aren't between 0 and 6", () => {
		const blockSet = new BlockSet(0)
		expect(blockSet.isInActiveWeekday(-1000)).toBe(false)
		expect(blockSet.isInActiveWeekday(42)).toBe(false)
	})
})

describe("test wildcarded pattern escaping", () => {
	test("adds ^ to beginning if pattern doesn't start with a wildcard", () => {
		expect(BlockSet.patternToRegExp("a").source.startsWith("^")).toBe(true)
	})

	test("adds $ to end if pattern doesn't end with a wildcard", () => {
		expect(BlockSet.patternToRegExp("a").source.endsWith("$")).toBe(true)
	})

	test("escapes regex reserved characters", () => {
		expect(BlockSet.patternToRegExp("[.*\\*+?^${}()|[]\\]äö❤"))
			.toStrictEqual(new RegExp(String.raw`^\[\..*\*\+\?\^\$\{\}\(\)\|\[\]\\\]äö❤$`))
	})

	test("replaces wildcards(*) with regexp wildcards(.*)", () => {
		expect(BlockSet.patternToRegExp("a*b*c")).toStrictEqual(new RegExp("^a.*b.*c$"))
	})

	test("does not replace already escaped wildcards(\\*)", () => {
		expect(BlockSet.patternToRegExp(String.raw`a\*b\*`))
			.toStrictEqual(new RegExp(String.raw`^a\*b\*$`))
	})
})

describe("test pattern escaping", () => {
	test("escapes *-characters", () => {
		expect(BlockSet.urlToPattern("**a*-.0/{")).toStrictEqual("\\*\\*a\\*-.0/{")
	})
})

describe("test BlockSet rule matching", () => {
	let blockSet: BlockSet
	beforeEach(() => {
		blockSet = new BlockSet(0)
	})

	test("can't add duplicate rules", async() => {
		blockSet.addPattern(ListType.Whitelist, "a")
		expect(() => blockSet.addPattern(ListType.Whitelist, "a")).toThrowError("Can't add duplicate")

		blockSet.addRegExp(ListType.Whitelist, "a")
		expect(() => blockSet.addRegExp(ListType.Whitelist, "a")).toThrowError("Can't add duplicate")

		blockSet.addYTCategory(ListType.Whitelist, "10")
		expect(() => blockSet.addYTCategory(ListType.Whitelist, "10"))
			.toThrowError("Can't add duplicate")
		
		await blockSet.addYTChannel(ListType.Whitelist, "a", "title")
		await expect(() => blockSet.addYTChannel(ListType.Whitelist, "a", "title2"))
			.rejects.toThrowError("Can't add duplicate")
	})

	test("can't add invalid YouTube categories", () => {
		expect(() => blockSet.addYTCategory(ListType.Whitelist, "a"))
			.toThrowError("Invalid YouTube category id")
		expect(() => blockSet.addYTCategory(ListType.Whitelist, "100"))
			.toThrowError("Invalid YouTube category id")
	})

	test("can't add invalid YouTube channels", async() => {
		mockedFetchChannelTitle.mockImplementation(() => Promise.resolve(err(FetchError.EmptyResponse)))

		await expect(blockSet.addYTChannel(ListType.Whitelist, "asd"))
			.rejects.toThrowError("YouTube channel with id not found")
	})

	test("returns Blacklisted when url is contained in black list", () => {
		blockSet.addPattern(ListType.Blacklist, "test")
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Blacklisted)
	})

	test("returns Whitelisted when url is contained in white list", () => {
		blockSet.addPattern(ListType.Whitelist, "test")
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Whitelisted)
	})

	test("whitelisting overrides blacklisting", () => {
		blockSet.addPattern(ListType.Blacklist, "test")
		blockSet.addPattern(ListType.Whitelist, "test")
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Whitelisted)
	})

	test("returns Ignored when url is not contained in whole block set", () => {
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Ignored)
	})

	test("can test rules with wildcards", () => {
		blockSet.addPattern(ListType.Blacklist, "*test*")
		blockSet.addPattern(ListType.Whitelist, "test")
		expect(blockSet.test("asdtestasd", null, null)).toStrictEqual(BlockTestRes.Blacklisted)
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Whitelisted)

		blockSet.removePattern(ListType.Blacklist, "*test*")
		blockSet.removePattern(ListType.Whitelist, "test")
		expect(blockSet.test("asdtestasd", null, null)).toStrictEqual(BlockTestRes.Ignored)
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Ignored)
	})

	test("can test RegExp rules", () => {
		blockSet.addRegExp(ListType.Blacklist, "^test\\w*$")
		blockSet.addRegExp(ListType.Whitelist, "^test$")
		expect(blockSet.test("testwithwords", null, null)).toStrictEqual(BlockTestRes.Blacklisted)
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Whitelisted)

		blockSet.removeRegExp(ListType.Blacklist, "^test\\w*$")
		blockSet.removeRegExp(ListType.Whitelist, "^test$")
		expect(blockSet.test("testwithwords", null, null)).toStrictEqual(BlockTestRes.Ignored)
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Ignored)
	})

	test("can test YouTube category rules", () => {
		blockSet.addYTCategory(ListType.Blacklist, "1")
		blockSet.addYTCategory(ListType.Whitelist, "10")
		expect(blockSet.test("", null, "1")).toStrictEqual(BlockTestRes.Blacklisted)
		expect(blockSet.test("", null, "10")).toStrictEqual(BlockTestRes.Whitelisted)

		blockSet.removeYTCategory(ListType.Blacklist, "1")
		blockSet.removeYTCategory(ListType.Whitelist, "10")
		expect(blockSet.test("", null, "1")).toStrictEqual(BlockTestRes.Ignored)
		expect(blockSet.test("", null, "10")).toStrictEqual(BlockTestRes.Ignored)
	})

	test("can test YouTube channel rules", async() => {
		await blockSet.addYTChannel(ListType.Blacklist, "ID1", "TITLE1")
		await blockSet.addYTChannel(ListType.Whitelist, "ID2", "TITLE2")
		expect(blockSet.test("", "ID1", null)).toStrictEqual(BlockTestRes.Blacklisted)
		expect(blockSet.test("", "ID2", null)).toStrictEqual(BlockTestRes.Whitelisted)

		blockSet.removeYTChannel(ListType.Blacklist, "ID1")
		blockSet.removeYTChannel(ListType.Whitelist, "ID2")
		expect(blockSet.test("", "ID1", null)).toStrictEqual(BlockTestRes.Ignored)
		expect(blockSet.test("", "ID2", null)).toStrictEqual(BlockTestRes.Ignored)
	})
})


describe.each([
	["timeElapsed", 1000],
	["name", "TEST"],
	["requireActive", true],
	["annoyMode", true],
	["timeAllowed", 1000],
	["resetTime", 1000],
	["lastReset", 1000],
	["activeDays", [false, false, false, true, true, true, true]],
	["activeTime", { from: 1, to: 2 }],
])("test BlockSet change callback %s", (funcName, testValue) => {
	const changedEventOf = <T>(value: T): ChangedEvent<T> => ({ newValue: value })
	const capitalize = (s: string) => s[0]?.toUpperCase() + s.slice(1)

	let blockSet: BlockSet
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const listener = jest.fn()
	const anyChangesListener = jest.fn()
	beforeEach(() => {
		blockSet = new BlockSet(0)
		blockSet.subscribeAnyChanged(anyChangesListener)
	})

	afterEach(() => jest.clearAllMocks())

	/* eslint-disable @typescript-eslint/ban-ts-comment */
	test("notifies on changes", () => {
		// ts does not like using bracket notation on classes, but use here for brevity
		//@ts-ignore 
		blockSet[`subscribe${capitalize(funcName as string)}Changed`](listener)
		// @ts-ignore
		blockSet[funcName] = testValue
		expect(listener).toBeCalledWith(changedEventOf(testValue))
		expect(anyChangesListener).toBeCalledWith(changedEventOf(blockSet))
	})

})