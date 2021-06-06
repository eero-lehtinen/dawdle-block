import { BlockSet } from "../src/scripts/block-set"

describe("BlockSet construction parameters", () => {
	const defaultBlockSetData = new BlockSet().getData()

	test("Non-objects throw", () => {
		expect(() => { new BlockSet("string") }).toThrow()
		expect(() => { new BlockSet(42) }).toThrow()
		expect(() => { new BlockSet(() => {return 0}) }).toThrow()
		expect(() => { new BlockSet(null)}).toThrow()
	})

	test("Objects with invalid types get rejeted and throw", () => {

		const testBlockSetObj = {
			requireActive: "string", 
			activeDays: undefined,
		}

		expect(() => { new BlockSet(testBlockSetObj)}).toThrow()
	})

	test("Incomplete objects get filled with defaults", () => {
		expect(new BlockSet({}).getData()).toStrictEqual(defaultBlockSetData)
	})

	test("Undefined parameter creates a default block set", () => {
		expect(new BlockSet(undefined).getData()).toStrictEqual(defaultBlockSetData)
	})

	test("Objects retain their valid property names and lose invalid ones", () => {

		const testBlockSetObj = {
			name: "retained", 
			loseMe: "lost",
		}

		const blockSetData = new BlockSet(testBlockSetObj).getData()

		expect(blockSetData).toHaveProperty("name")
		expect(blockSetData).not.toHaveProperty("loseMe")
	})

	test("V0 block sets get converted to V1", () => {

		const testBlockSetObj = {
			blacklist: [
				{ type: "urlEquals", value: "test" },
				{ type: "urlContains", value: "test" },
				{ type: "urlPrefix", value: "test" },
				{ type: "urlSuffix", value: "test" },
				{ type: "urlRegexp", value: "test" },
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
			},
		}

		expect(new BlockSet(testBlockSetObj).getData()).toMatchObject(testBlockSetObjResult)
	})
})

describe("BlockSet url testing", () => {
	test.todo("Returns Blacklisted when url is contained in black list")

	test.todo("Returns Whitelisted when url is contained in white list")

	test.todo("Whitelisting overrides blacklisting")

	test.todo("Returns Ignored when url is not contained in whole block set")

	test.todo("Rules with wildcards work")

	test.todo("Rules with RegExps work")

	test.todo("YouTube channel rules work")

	test.todo("YouTube category rules work")
})