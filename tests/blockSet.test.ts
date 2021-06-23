import { BlockSet, BlockTestRes, ListType } from "../src/scripts/background/blockSet"
import { timeToMSSinceMidnight } from "../src/scripts/background/timeUtils"

describe("test BlockSet construction parameters", () => {
	const defaultBlockSetData = new BlockSet().getData()

	it("non-objects throw", () => {
		expect(() => { new BlockSet("string") }).toThrow()
		expect(() => { new BlockSet(42) }).toThrow()
		expect(() => { new BlockSet(() => {return 0}) }).toThrow()
		expect(() => { new BlockSet(null)}).toThrow()
	})

	it("objects with members of invalid types throw", () => {

		const testBlockSetObj = {
			v: 1,
			requireActive: "string", 
			activeDays: undefined,
		}

		expect(() => { new BlockSet(testBlockSetObj)}).toThrow()
	})

	it("incomplete objects get filled with defaults", () => {
		expect(new BlockSet({}).getData()).toStrictEqual(defaultBlockSetData)
	})

	it("undefined creates a default block set", () => {
		expect(new BlockSet(undefined).getData()).toStrictEqual(defaultBlockSetData)
	})

	it("objects retain their valid property names and lose invalid ones", () => {

		const testBlockSetObj = {
			v: 1,
			name: "retained", 
			loseMe: "lost",
		}

		const blockSetData = new BlockSet(testBlockSetObj).getData()

		expect(blockSetData).toHaveProperty("name")
		expect(blockSetData).not.toHaveProperty("loseMe")
	})

	it("V0 block sets get converted to V1", () => {

		const testBlockSetObj = {
			blacklist: [
				{ type: "urlEquals", value: "test" },
				{ type: "urlContains", value: "test" },
				{ type: "urlPrefix", value: "test" },
				{ type: "urlSuffix", value: "test" },
				{ type: "urlRegexp", value: "test" },
				{ type: "ytChannel", value: { id: "channelid", name: "testchannel" } },
				{ type: "ytCategory", value: { id: "42", name: "testcategory" } },
			],
		}

		const testBlockSetObjResult = {
			blacklist: {
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
					{ id: "channelid", name: "testchannel" },
				],
				ytCategories: [
					{ id: "42", name: "testcategory" },
				],
			},
		}

		expect(new BlockSet(testBlockSetObj).getData()).toMatchObject(testBlockSetObjResult)
	})

	it("V0 \"*\"-characters get escaped when converting to V1", () => {

		const testBlockSetObj = {
			whitelist: [
				{ type: "urlEquals", value: "*te*st*" },
				{ type: "urlContains", value: "*te*st*" },
			],
		}

		const testBlockSetObjResult = {
			whitelist: {
				urlPatterns: [
					String.raw`\*te\*st\*`,
					String.raw`*\*te\*st\**`,
				],
			},
		}

		expect(new BlockSet(testBlockSetObj).getData()).toMatchObject(testBlockSetObjResult)
	})
})

describe("test BlockSet methods", () => {

	const testIsInActiveTimes = (blockSet: BlockSet, dateResultPairs: Array<{date: Date, result: boolean}>) => {
		for (const { date, result } of dateResultPairs) {
			expect(blockSet.isInActiveTime(timeToMSSinceMidnight(date))).toBe(result)
		}
	}
	

	it("isInActiveTime returns always true, if activeTime from and to are the same", () => {
		const blockSet = new BlockSet({ activeTime: { from: 0, to: 0 } })
		const dateResultPairs = [
			{ date: new Date(0), result: true },
			{ date: new Date(42), result: true },
			{ date: new Date(), result: true },
		]
		testIsInActiveTimes(blockSet, dateResultPairs)
	})

	it("isInActiveTime returns true, if today's time is between from and to", () => {
		const blockSet = new BlockSet({ activeTime: { from: 0, to: 1 * 60 * 60 * 1000 } })
		const dateResultPairs = [
			{ date: new Date("2000-01-01T00:00:00"), result: false },
			{ date: new Date("2000-01-01T00:30:00"), result: true },
			{ date: new Date("2000-01-01T01:00:00"), result: false },
			{ date: new Date("2000-01-01T06:00:00"), result: false },
		]
		testIsInActiveTimes(blockSet, dateResultPairs)
	})

	it("if to is less than to, calculation of being in between wraps around midnight instead", () => {
		const blockSet = new BlockSet({ activeTime: { from: 1 * 60 * 60 * 1000, to: 0 } })
		const dateResultPairs = [
			{ date: new Date("2000-01-01T00:00:00"), result: false },
			{ date: new Date("2000-01-01T00:30:00"), result: false },
			{ date: new Date("2000-01-01T01:00:00"), result: false },
			{ date: new Date("2000-01-01T06:00:00"), result: true },
		]
		testIsInActiveTimes(blockSet, dateResultPairs)
	})


	it("active weekday detection returns values of activeDays for values between 0 and 6", () => {
		const activeDays = [false, true, false, false, true, false, false]
		const blockSet = new BlockSet({ activeDays })
		for (let i = 0; i < activeDays.length; i++) {
			expect(blockSet.isInActiveWeekday(i)).toBe(activeDays[i])
		}
	})

	it("active weekday detection returns false for all numbers that aren't between 0 and 6", () => {
		const blockSet = new BlockSet()
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
		expect(BlockSet.patternToRegExp(String.raw`a\*b\*`)).toStrictEqual(new RegExp(String.raw`^a\*b\*$`))
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
		blockSet = new BlockSet()
	})

	it("can't add duplicate rules", () => {
		expect(blockSet.addPattern(ListType.Whitelist, "a")).toStrictEqual(true)
		expect(blockSet.addPattern(ListType.Whitelist, "a")).toStrictEqual(false)

		expect(blockSet.addRegExp(ListType.Whitelist, "a")).toStrictEqual(true)
		expect(blockSet.addRegExp(ListType.Whitelist, "a")).toStrictEqual(false)
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

	it("can test rules with RegExps", () => {
		blockSet.addRegExp(ListType.Blacklist, "^test\\w*$")
		blockSet.addRegExp(ListType.Whitelist, "^test$")
		expect(blockSet.test("testwithwords", null, null)).toStrictEqual(BlockTestRes.Blacklisted)
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Whitelisted)

		blockSet.removeRegExp(ListType.Blacklist, "^test\\w*$")
		blockSet.removeRegExp(ListType.Whitelist, "^test$")
		expect(blockSet.test("testwithwords", null, null)).toStrictEqual(BlockTestRes.Ignored)
		expect(blockSet.test("test", null, null)).toStrictEqual(BlockTestRes.Ignored)
	})

	it.todo("youTube channel rules can be tested")

	it.todo("youTube category rules can be tested")
})