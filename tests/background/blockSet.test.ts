import { mocked } from "ts-jest/utils"
import {
	BlockSet,
	BlockTestRes,
	DuplicateAddError,
	InvalidRegExpAddError,
	InvalidYTCategoryIdAddError,
	ListType,
} from "@src/background/blockSet"
import { BlockSetData } from "@src/background/blockSetParseTypes"
import { dateToTodayMS } from "@src/shared/utils"
import ms from "ms.macro"

// Mock needed for a single test
import { EmptyResponseFetchError, fetchChannelTitle } from "@src/background/youtubeAPI"
import { ChangedEvent } from "@src/background/observer"
import { err, errAsync, okAsync } from "neverthrow"
import blockSetCmpObj from "../testHelpers/blockSetCmpObj"
jest.mock("@src/background/youtubeAPI")
const mockedFetchChannelTitle = mocked(fetchChannelTitle)

describe("test BlockSet construction parameters", () => {
	const defaultBlockSet = BlockSet.createDefault(0)

	test("non-objects throw", () => {
		jest.spyOn(console, "error").mockImplementation(() => {
			/*do nothing*/
		})
		expect(BlockSet.create(0, "string").isErr()).toBe(true)
		expect(BlockSet.create(0, 42).isErr()).toBe(true)
		expect(BlockSet.create(0, () => null).isErr()).toBe(true)
		expect(BlockSet.create(0, []).isErr()).toBe(true)
		expect(BlockSet.create(0, null).isErr()).toBe(true)
		expect(BlockSet.create(0, undefined).isErr()).toBe(true)
	})

	test("objects with members of invalid types throw", () => {
		const testBlockSetObj = {
			v: 1,
			requireActive: "string",
			activeDays: undefined,
		}

		expect(BlockSet.create(0, testBlockSetObj).isErr()).toBe(true)
	})

	test("incomplete objects get filled with defaults", () => {
		expect(BlockSet.create(0, {})._unsafeUnwrap()).toEqual(blockSetCmpObj(defaultBlockSet))
	})

	test("objects retain their valid property names and lose invalid ones", () => {
		const testBlockSetObj = {
			v: 1,
			name: "retained",
			loseMe: "lost",
		}

		const blockSet = BlockSet.create(0, testBlockSetObj)._unsafeUnwrap()

		expect(blockSet.data).toHaveProperty("name")
		expect(blockSet.data).not.toHaveProperty("loseMe")
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
			urlPatterns: ["test", "*test*", "test*", "*test"],
			urlRegExps: ["test"],
			ytChannels: [{ id: "channelid", title: "testchannel" }],
			ytCategoryIds: ["42"],
		}

		const testBlockSetObj = {
			blacklist: listV0,
			whitelist: listV0,
		}
		const testBlockSetObjExpected: BlockSetData = {
			...defaultBlockSet.data,
			blacklist: listV1Expected,
			whitelist: listV1Expected,
		}

		expect(BlockSet.create(0, testBlockSetObj)._unsafeUnwrap().data).toStrictEqual(
			testBlockSetObjExpected
		)
	})

	test('V0 "*"-characters get escaped when converting to V1', () => {
		const listV0 = [
			{ type: "urlEquals", value: "*te*st*" },
			{ type: "urlContains", value: "*te*st*" },
		]
		const listV1Expected = {
			urlPatterns: [String.raw`\*te\*st\*`, String.raw`*\*te\*st\**`],
			urlRegExps: [],
			ytChannels: [],
			ytCategoryIds: [],
		}

		const testBlockSetObj = {
			blacklist: listV0,
			whitelist: listV0,
		}

		const testBlockSetObjExpected = {
			...defaultBlockSet.data,
			blacklist: listV1Expected,
			whitelist: listV1Expected,
		}

		expect(BlockSet.create(0, testBlockSetObj)._unsafeUnwrap().data).toStrictEqual(
			testBlockSetObjExpected
		)
	})
})

describe("test BlockSet methods", () => {
	const expectIsInActiveTimes = (
		blockSet: BlockSet,
		dateResultPairs: Array<{ date: Date; result: boolean }>
	) => {
		for (const { date, result } of dateResultPairs) {
			expect(blockSet.isInActiveTime(dateToTodayMS(date))).toBe(result)
		}
	}

	test("isInActiveTime returns always true, if activeTime from and to are the same", () => {
		const blockSet = BlockSet.create(0, {
			activeTime: { from: 0, to: 0 },
		})._unsafeUnwrap()
		const dateResultPairs = [
			{ date: new Date(0), result: true },
			{ date: new Date(42), result: true },
			{ date: new Date(), result: true },
		]
		expectIsInActiveTimes(blockSet, dateResultPairs)
	})

	test("isInActiveTime returns true, if today's time is between from and to", () => {
		const blockSet = BlockSet.create(0, {
			activeTime: { from: 0, to: ms("1h") },
		})._unsafeUnwrap()
		const dateResultPairs = [
			{ date: new Date("2000-01-01T00:00:00"), result: false },
			{ date: new Date("2000-01-01T00:30:00"), result: true },
			{ date: new Date("2000-01-01T01:00:00"), result: false },
			{ date: new Date("2000-01-01T06:00:00"), result: false },
		]
		expectIsInActiveTimes(blockSet, dateResultPairs)
	})

	test(
		"if to is less than from, calculation of being in between wraps around " +
			"midnight instead",
		() => {
			const blockSet = BlockSet.create(0, {
				activeTime: { from: ms("1h"), to: 0 },
			})._unsafeUnwrap()
			const dateResultPairs = [
				{ date: new Date("2000-01-01T00:00:00"), result: false },
				{ date: new Date("2000-01-01T00:30:00"), result: false },
				{ date: new Date("2000-01-01T01:00:00"), result: false },
				{ date: new Date("2000-01-01T06:00:00"), result: true },
			]
			expectIsInActiveTimes(blockSet, dateResultPairs)
		}
	)

	test("active weekday detection returns values of activeDays for values between 0 and 6", () => {
		const activeDays = [false, true, false, false, true, false, false]
		const blockSet = BlockSet.create(0, { activeDays })._unsafeUnwrap()
		for (let i = 0; i < activeDays.length; i++) {
			expect(blockSet.isInActiveWeekday(i)).toBe(activeDays[i])
		}
	})

	test("active weekday detection returns false for all numbers that aren't between 0 and 6", () => {
		const blockSet = BlockSet.createDefault(0)
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
		expect(BlockSet.patternToRegExp("[.*\\*+?^${}()|[]\\]äö❤")).toStrictEqual(
			new RegExp(String.raw`^\[\..*\*\+\?\^\$\{\}\(\)\|\[\]\\\]äö❤$`)
		)
	})

	test("replaces wildcards(*) with regexp wildcards(.*)", () => {
		expect(BlockSet.patternToRegExp("a*b*c")).toStrictEqual(new RegExp("^a.*b.*c$"))
	})

	test("does not replace already escaped wildcards(\\*)", () => {
		expect(BlockSet.patternToRegExp(String.raw`a\*b\*`)).toStrictEqual(
			new RegExp(String.raw`^a\*b\*$`)
		)
	})
})

describe("test pattern escaping", () => {
	test("escapes *-characters", () => {
		expect(BlockSet.urlToPattern("**a*-.0/{")).toStrictEqual(String.raw`\*\*a\*-.0/{`)
	})

	test(String.raw`escapes \-characters`, () => {
		expect(BlockSet.urlToPattern(String.raw`\abc\\\ab\\`)).toStrictEqual(
			String.raw`\\abc\\\\\\ab\\\\`
		)
	})
})

describe("test BlockSet rule addition/deletion/manipulation", () => {
	const changedEventOf = <T>(value: T): ChangedEvent<T> => ({ newValue: value })

	let blockSet: BlockSet
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const listener = jest.fn()
	const anyChangesListener = jest.fn()
	beforeEach(() => {
		blockSet = BlockSet.createDefault(0)
		blockSet.subscribeChanged("any", anyChangesListener)
	})

	afterEach(() => jest.clearAllMocks())

	test("can't add duplicate rules", async () => {
		blockSet.addPattern(ListType.Whitelist, "a")
		expect(blockSet.addPattern(ListType.Whitelist, "a")._unsafeUnwrapErr()).toBeInstanceOf(
			DuplicateAddError
		)

		blockSet.addRegExp(ListType.Whitelist, "a")
		expect(blockSet.addRegExp(ListType.Whitelist, "a")._unsafeUnwrapErr()).toBeInstanceOf(
			DuplicateAddError
		)

		blockSet.addYTCategory(ListType.Whitelist, "10")
		expect(blockSet.addYTCategory(ListType.Whitelist, "10")._unsafeUnwrapErr()).toBeInstanceOf(
			DuplicateAddError
		)

		mockedFetchChannelTitle.mockResolvedValue(okAsync("title"))
		await blockSet.addYTChannel(ListType.Whitelist, "a")
		expect(
			(await blockSet.addYTChannel(ListType.Whitelist, "a"))._unsafeUnwrapErr()
		).toBeInstanceOf(DuplicateAddError)
	})

	test("can't add invalid YouTube categories", () => {
		expect(blockSet.addYTCategory(ListType.Whitelist, "a")._unsafeUnwrapErr()).toBeInstanceOf(
			InvalidYTCategoryIdAddError
		)
		expect(blockSet.addYTCategory(ListType.Whitelist, "100")._unsafeUnwrapErr()).toBeInstanceOf(
			InvalidYTCategoryIdAddError
		)
	})

	test("can't add invalid YouTube channels", async () => {
		const error = new EmptyResponseFetchError()
		mockedFetchChannelTitle.mockResolvedValueOnce(errAsync(error))

		expect(await blockSet.addYTChannel(ListType.Whitelist, "asd")).toEqual(err(error))
	})

	test("can't add invalid regular expressions", () => {
		// Unmatched parenthesis
		const res = blockSet.addRegExp(ListType.Blacklist, "(asd")
		expect(res._unsafeUnwrapErr()).toBeInstanceOf(InvalidRegExpAddError)
	})

	test("can add URL patterns", () => {
		blockSet.subscribeBlockListChanged(ListType.Blacklist, "urlPatterns", listener)
		blockSet.addPattern(ListType.Blacklist, "test")
		expect(blockSet.data[ListType.Blacklist].urlPatterns).toEqual(["test"])
		expect(listener).toBeCalledWith(changedEventOf(["test"]))
		expect(anyChangesListener).toBeCalledWith(changedEventOf(blockSet))
	})

	test("can remove URL patterns", () => {
		blockSet.addPattern(ListType.Blacklist, "test")
		blockSet.subscribeBlockListChanged(ListType.Blacklist, "urlPatterns", listener)
		expect(blockSet.removePattern(ListType.Blacklist, "test")).toBeTrue()
		expect(blockSet.data[ListType.Blacklist].urlPatterns).toEqual([])
		expect(listener).toBeCalledWith(changedEventOf([]))
		expect(anyChangesListener).toBeCalledWith(changedEventOf(blockSet))
	})

	test("can add regular expressions", () => {
		blockSet.subscribeBlockListChanged(ListType.Blacklist, "urlRegExps", listener)
		blockSet.addRegExp(ListType.Blacklist, "test")
		expect(blockSet.data[ListType.Blacklist].urlRegExps).toEqual(["test"])
		expect(listener).toBeCalledWith(changedEventOf(["test"]))
		expect(anyChangesListener).toBeCalledWith(changedEventOf(blockSet))
	})

	test("can remove regular expressions", () => {
		blockSet.addRegExp(ListType.Blacklist, "test")
		blockSet.subscribeBlockListChanged(ListType.Blacklist, "urlRegExps", listener)
		expect(blockSet.removeRegExp(ListType.Blacklist, "test")).toBeTrue()
		expect(blockSet.data[ListType.Blacklist].urlRegExps).toEqual([])
		expect(listener).toBeCalledWith(changedEventOf([]))
		expect(anyChangesListener).toBeCalledWith(changedEventOf(blockSet))
	})

	test("can add YT channels", async () => {
		mockedFetchChannelTitle.mockResolvedValue(okAsync("testTitle"))
		blockSet.subscribeBlockListChanged(ListType.Blacklist, "ytChannels", listener)
		await blockSet.addYTChannel(ListType.Blacklist, "testId")
		expect(blockSet.data[ListType.Blacklist].ytChannels).toEqual([
			{ id: "testId", title: "testTitle" },
		])
		expect(listener).toBeCalledWith(changedEventOf([{ id: "testId", title: "testTitle" }]))
		expect(anyChangesListener).toBeCalledWith(changedEventOf(blockSet))
	})

	test("can remove YT channels", async () => {
		mockedFetchChannelTitle.mockResolvedValue(okAsync("testTitle"))
		await blockSet.addYTChannel(ListType.Blacklist, "testId")
		blockSet.subscribeBlockListChanged(ListType.Blacklist, "ytChannels", listener)
		expect(blockSet.removeYTChannel(ListType.Blacklist, "testId")).toBeTrue()
		expect(blockSet.data[ListType.Blacklist].ytChannels).toEqual([])
		expect(listener).toBeCalledWith(changedEventOf([]))
		expect(anyChangesListener).toBeCalledWith(changedEventOf(blockSet))
	})

	test("can add YT categories", async () => {
		blockSet.subscribeBlockListChanged(ListType.Blacklist, "ytCategoryIds", listener)
		blockSet.addYTCategory(ListType.Blacklist, "10")
		expect(blockSet.data[ListType.Blacklist].ytCategoryIds).toEqual(["10"])
		expect(listener).toBeCalledWith(changedEventOf(["10"]))
		expect(anyChangesListener).toBeCalledWith(changedEventOf(blockSet))
	})

	test("can remove YT categories", () => {
		blockSet.addYTCategory(ListType.Blacklist, "10")
		blockSet.subscribeBlockListChanged(ListType.Blacklist, "ytCategoryIds", listener)
		expect(blockSet.removeYTCategory(ListType.Blacklist, "10")).toBeTrue()
		expect(blockSet.data[ListType.Blacklist].ytCategoryIds).toEqual([])
		expect(listener).toBeCalledWith(changedEventOf([]))
		expect(anyChangesListener).toBeCalledWith(changedEventOf(blockSet))
	})

	describe("removal returns false if nothing could be removed", () => {
		beforeEach(() => {
			blockSet.addPattern(ListType.Blacklist, "1")
		})

		test("URL patterns", () => {
			expect(blockSet.removePattern(ListType.Blacklist, "doesn't exist")).toBeFalse()
			expect(listener).toBeCalledTimes(0)
		})
		test("regular expressions", () => {
			expect(blockSet.removeRegExp(ListType.Blacklist, "doesn't exist")).toBeFalse()
			expect(listener).toBeCalledTimes(0)
		})
		test("YT channels", () => {
			expect(blockSet.removeYTChannel(ListType.Blacklist, "doesn't exist")).toBeFalse()
			expect(listener).toBeCalledTimes(0)
		})
		test("YT categories", () => {
			expect(blockSet.removeYTCategory(ListType.Blacklist, "doesn't exist")).toBeFalse()
			expect(listener).toBeCalledTimes(0)
		})
	})

	describe("test rule list reordering", () => {
		beforeEach(() => {
			blockSet.addPattern(ListType.Blacklist, "1")
			blockSet.addPattern(ListType.Blacklist, "2")
			blockSet.addPattern(ListType.Blacklist, "3")
			anyChangesListener.mockClear()
		})

		test("base case", () => {
			blockSet.subscribeBlockListChanged(ListType.Blacklist, "urlPatterns", listener)

			blockSet.moveBlockListRule(ListType.Blacklist, "urlPatterns", 0, 1)

			expect(blockSet.data[ListType.Blacklist].urlPatterns).toEqual(["2", "1", "3"])
			expect(listener).toBeCalledWith(changedEventOf(["2", "1", "3"]))
			expect(anyChangesListener).toBeCalledWith(changedEventOf(blockSet))
		})

		test("does nothing when any indices are out of bounds or equal", () => {
			blockSet.subscribeBlockListChanged(ListType.Blacklist, "urlPatterns", listener)

			blockSet.moveBlockListRule(ListType.Blacklist, "urlPatterns", -1, 1)
			blockSet.moveBlockListRule(ListType.Blacklist, "urlPatterns", 10, 1)
			blockSet.moveBlockListRule(ListType.Blacklist, "urlPatterns", 1, -1)
			blockSet.moveBlockListRule(ListType.Blacklist, "urlPatterns", 1, 10)
			blockSet.moveBlockListRule(ListType.Blacklist, "urlPatterns", 1, 1)

			expect(blockSet.data[ListType.Blacklist].urlPatterns).toEqual(["1", "2", "3"])
			expect(listener).toBeCalledTimes(0)
			expect(anyChangesListener).toBeCalledTimes(0)
		})
	})
})

describe("test BlockSet rule matching", () => {
	let blockSet: BlockSet
	beforeEach(() => {
		blockSet = BlockSet.createDefault(0)
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

	test("can test YouTube channel rules", async () => {
		mockedFetchChannelTitle.mockResolvedValue(okAsync("TEST_TITLE"))
		await blockSet.addYTChannel(ListType.Blacklist, "ID1")
		await blockSet.addYTChannel(ListType.Whitelist, "ID2")
		expect(blockSet.test("", "ID1", null)).toStrictEqual(BlockTestRes.Blacklisted)
		expect(blockSet.test("", "ID2", null)).toStrictEqual(BlockTestRes.Whitelisted)

		blockSet.removeYTChannel(ListType.Blacklist, "ID1")
		blockSet.removeYTChannel(ListType.Whitelist, "ID2")
		expect(blockSet.test("", "ID1", null)).toStrictEqual(BlockTestRes.Ignored)
		expect(blockSet.test("", "ID2", null)).toStrictEqual(BlockTestRes.Ignored)
	})
})
