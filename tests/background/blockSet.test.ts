import { mocked } from "ts-jest/utils"
import { BlockSet, BlockTestRes, ChangedEvent, ListType } from "@src/background/blockSet"
import { BlockSetData, ActiveTime, ActiveDays } from "@src/background/blockSetParser"
import { timeToMSSinceMidnight } from "@src/shared/utils"

// Mock needed for a single test
import{ fetchChannelTitle } from "@src/background/youtubeAPI"
jest.mock("@src/background/youtubeAPI")
const mockedFetchChannelTitle = mocked(fetchChannelTitle)

describe("test BlockSet construction parameters", () => {
	const defaultBlockSetData = new BlockSet(0).data

	it("non-objects throw", () => {
		jest.spyOn(console, "error").mockImplementation(() => {/*do nothing*/})
		expect(() => new BlockSet(0, "string")).toThrow()
		expect(() => new BlockSet(0, 42)).toThrow()
		expect(() => new BlockSet(0, () => {return 0})).toThrow()
		expect(() => new BlockSet(0, [])).toThrow()
		expect(() => new BlockSet(0, null)).toThrow()
	})

	it("objects with members of invalid types throw", () => {
		const testBlockSetObj = {
			v: 1,
			requireActive: "string", 
			activeDays: undefined,
		}

		expect(() => { new BlockSet(0, testBlockSetObj)}).toThrow()
	})

	it("incomplete objects get filled with defaults", () => {
		expect(new BlockSet(0, {}).data).toStrictEqual(defaultBlockSetData)
	})

	it("undefined creates a default block set", () => {
		expect(new BlockSet(0, undefined).data).toStrictEqual(defaultBlockSetData)
		expect(new BlockSet(0).data).toStrictEqual(defaultBlockSetData)
	})

	it("objects retain their valid property names and lose invalid ones", () => {
		const testBlockSetObj = {
			v: 1,
			name: "retained", 
			loseMe: "lost",
		}

		const blockSetData = new BlockSet(0, testBlockSetObj).data

		expect(blockSetData).toHaveProperty("name")
		expect(blockSetData).not.toHaveProperty("loseMe")
	})

	it("V0 block sets get converted to V1", () => {
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

	it("V0 \"*\"-characters get escaped when converting to V1", () => {
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
	

	it("isInActiveTime returns always true, if activeTime from and to are the same", () => {
		const blockSet = new BlockSet(0, { activeTime: { from: 0, to: 0 } })
		const dateResultPairs = [
			{ date: new Date(0), result: true },
			{ date: new Date(42), result: true },
			{ date: new Date(), result: true },
		]
		expectIsInActiveTimes(blockSet, dateResultPairs)
	})

	it("isInActiveTime returns true, if today's time is between from and to", () => {
		const blockSet = new BlockSet(0, { activeTime: { from: 0, to: 1 * 60 * 60 * 1000 } })
		const dateResultPairs = [
			{ date: new Date("2000-01-01T00:00:00"), result: false },
			{ date: new Date("2000-01-01T00:30:00"), result: true },
			{ date: new Date("2000-01-01T01:00:00"), result: false },
			{ date: new Date("2000-01-01T06:00:00"), result: false },
		]
		expectIsInActiveTimes(blockSet, dateResultPairs)
	})

	it("if to is less than to, calculation of being in between wraps around midnight instead", () => {
		const blockSet = new BlockSet(0, { activeTime: { from: 1 * 60 * 60 * 1000, to: 0 } })
		const dateResultPairs = [
			{ date: new Date("2000-01-01T00:00:00"), result: false },
			{ date: new Date("2000-01-01T00:30:00"), result: false },
			{ date: new Date("2000-01-01T01:00:00"), result: false },
			{ date: new Date("2000-01-01T06:00:00"), result: true },
		]
		expectIsInActiveTimes(blockSet, dateResultPairs)
	})


	it("active weekday detection returns values of activeDays for values between 0 and 6", () => {
		const activeDays = [false, true, false, false, true, false, false]
		const blockSet = new BlockSet(0, { activeDays })
		for (let i = 0; i < activeDays.length; i++) {
			expect(blockSet.isInActiveWeekday(i)).toBe(activeDays[i])
		}
	})

	it("active weekday detection returns false for all numbers that aren't between 0 and 6", () => {
		const blockSet = new BlockSet(0)
		expect(blockSet.isInActiveWeekday(-1000)).toBe(false)
		expect(blockSet.isInActiveWeekday(42)).toBe(false)
	})
})

describe("test wildcarded pattern escaping", () => {
	it("adds ^ to beginning if pattern doesn't start with a wildcard", () => {
		expect(BlockSet.patternToRegExp("a").source.startsWith("^")).toBe(true)
	})

	it("adds $ to end if pattern doesn't end with a wildcard", () => {
		expect(BlockSet.patternToRegExp("a").source.endsWith("$")).toBe(true)
	})

	it("escapes regex reserved characters", () => {
		expect(BlockSet.patternToRegExp("[.*\\*+?^${}()|[]\\]äö❤"))
			.toStrictEqual(new RegExp(String.raw`^\[\..*\*\+\?\^\$\{\}\(\)\|\[\]\\\]äö❤$`))
	})

	it("replaces wildcards(*) with regexp wildcards(.*)", () => {
		expect(BlockSet.patternToRegExp("a*b*c")).toStrictEqual(new RegExp("^a.*b.*c$"))
	})

	it("does not replace already escaped wildcards(\\*)", () => {
		expect(BlockSet.patternToRegExp(String.raw`a\*b\*`))
			.toStrictEqual(new RegExp(String.raw`^a\*b\*$`))
	})
})

describe("test pattern escaping", () => {
	it("escapes *-characters", () => {
		expect(BlockSet.urlToPattern("**a*-.0/{")).toStrictEqual("\\*\\*a\\*-.0/{")
	})
})

describe("test BlockSet rule matching", () => {
	let blockSet: BlockSet
	beforeEach(() => {
		blockSet = new BlockSet(0)
	})

	it("can't add duplicate rules", async() => {
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

	it("can't add invalid YouTube categories", () => {
		expect(() => blockSet.addYTCategory(ListType.Whitelist, "a"))
			.toThrowError("Invalid YouTube category id")
		expect(() => blockSet.addYTCategory(ListType.Whitelist, "100"))
			.toThrowError("Invalid YouTube category id")
	})

	it("can't add invalid YouTube channels", async() => {
		mockedFetchChannelTitle.mockImplementation(() => {throw "YouTube channel with id not found"})

		await expect(blockSet.addYTChannel(ListType.Whitelist, "asd"))
			.rejects.toThrowError("YouTube channel with id not found")
	})

	it("returns Blacklisted when url is contained in black list", () => {
		blockSet.addPattern(ListType.Blacklist, "test")
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Blacklisted)
	})

	it("returns Whitelisted when url is contained in white list", () => {
		blockSet.addPattern(ListType.Whitelist, "test")
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Whitelisted)
	})

	it("whitelisting overrides blacklisting", () => {
		blockSet.addPattern(ListType.Blacklist, "test")
		blockSet.addPattern(ListType.Whitelist, "test")
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Whitelisted)
	})

	it("returns Ignored when url is not contained in whole block set", () => {
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Ignored)
	})

	it("can test rules with wildcards", () => {
		blockSet.addPattern(ListType.Blacklist, "*test*")
		blockSet.addPattern(ListType.Whitelist, "test")
		expect(blockSet.test("asdtestasd", null, null)).toStrictEqual(BlockTestRes.Blacklisted)
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Whitelisted)

		blockSet.removePattern(ListType.Blacklist, "*test*")
		blockSet.removePattern(ListType.Whitelist, "test")
		expect(blockSet.test("asdtestasd", null, null)).toStrictEqual(BlockTestRes.Ignored)
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Ignored)
	})

	it("can test RegExp rules", () => {
		blockSet.addRegExp(ListType.Blacklist, "^test\\w*$")
		blockSet.addRegExp(ListType.Whitelist, "^test$")
		expect(blockSet.test("testwithwords", null, null)).toStrictEqual(BlockTestRes.Blacklisted)
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Whitelisted)

		blockSet.removeRegExp(ListType.Blacklist, "^test\\w*$")
		blockSet.removeRegExp(ListType.Whitelist, "^test$")
		expect(blockSet.test("testwithwords", null, null)).toStrictEqual(BlockTestRes.Ignored)
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Ignored)
	})

	it("can test YouTube category rules", () => {
		blockSet.addYTCategory(ListType.Blacklist, "1")
		blockSet.addYTCategory(ListType.Whitelist, "10")
		expect(blockSet.test("", null, "1")).toStrictEqual(BlockTestRes.Blacklisted)
		expect(blockSet.test("", null, "10")).toStrictEqual(BlockTestRes.Whitelisted)

		blockSet.removeYTCategory(ListType.Blacklist, "1")
		blockSet.removeYTCategory(ListType.Whitelist, "10")
		expect(blockSet.test("", null, "1")).toStrictEqual(BlockTestRes.Ignored)
		expect(blockSet.test("", null, "10")).toStrictEqual(BlockTestRes.Ignored)
	})

	it("can test YouTube channel rules", async() => {
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

describe("test BlockSet change listening", () => {
	const changedEventOf = <T>(value: T): ChangedEvent<T> => ({ newValue: value })

	let blockSet: BlockSet
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let listener: jest.Mock<any, any>
	beforeEach(() => {
		blockSet = new BlockSet(0)
		listener = jest.fn()
	})

	it("notifies on active time changes", () => {
		blockSet.subscribeActiveTimeChanged(listener)
		const testActiveTime: ActiveTime = { from: 0, to: 1 }
		blockSet.activeTime = testActiveTime
		expect(listener).toBeCalledWith(changedEventOf(testActiveTime))
	})

	it("notifies on active day changes", () => {
		blockSet.subscribeActiveDaysChanged(listener)
		const testActiveDays: ActiveDays = [true, true, true, true, true, false, false]
		blockSet.activeDays = testActiveDays
		expect(listener).toBeCalledWith(changedEventOf(testActiveDays))
	})
})