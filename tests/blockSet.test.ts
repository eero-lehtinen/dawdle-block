import { BlockSet } from "../src/scripts/background/blockSet"
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
	it("can escape a basic example", () => {
		expect(BlockSet.patternToRegExp("[.*\\*+?^${}()|[]\\]äö❤"))
			.toStrictEqual(new RegExp(String.raw`\[\..*\*\+\?\^\$\{\}\(\)\|\[\]\\\]äö❤`))
	})

	it("replaces wildcards(*) with regexp wildcards(.*)", () => {
		expect(BlockSet.patternToRegExp("a*b*")).toStrictEqual(new RegExp("a.*b.*"))
	})

	it("does not replace already escaped wildcards(*)", () => {
		expect(BlockSet.patternToRegExp(String.raw`a\*b\*`)).toStrictEqual(new RegExp(String.raw`a\*b\*`))
	})
})

describe("test pattern escaping", () => {
	it("escapes *-characters", () => {
		expect(BlockSet.urlToPattern("**a*-.0/{")).toStrictEqual("\\*\\*a\\*-.0/{")
	})
})

describe("test BlockSet url matching", () => {
	it.todo("returns Blacklisted when url is contained in black list")

	it.todo("returns Whitelisted when url is contained in white list")

	it.todo("whitelisting overrides blacklisting")

	it.todo("returns Ignored when url is not contained in whole block set")

	it.todo("rules with wildcards work")

	it.todo("rules with RegExps work")

	it.todo("youTube channel rules work")

	it.todo("youTube category rules work")
})