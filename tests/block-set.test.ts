import { BlockSet } from "../src/scripts/background/block-set"

describe("test BlockSet construction parameters", () => {
	const defaultBlockSetData = new BlockSet().getData()

	it("non-objects throw", () => {
		expect(() => { new BlockSet("string") }).toThrow()
		expect(() => { new BlockSet(42) }).toThrow()
		expect(() => { new BlockSet(() => {return 0}) }).toThrow()
		expect(() => { new BlockSet(null)}).toThrow()
	})

	it("objects with ", () => {

		const testBlockSetObj = {
			v: 1,
			requireActive: "string", 
			activeDays: undefined,
		}

		expect(() => { new BlockSet(testBlockSetObj)}).toThrow()
	})

	it("Incomplete objects get filled with defaults", () => {
		expect(new BlockSet({}).getData()).toStrictEqual(defaultBlockSetData)
	})

	it("Undefined parameter creates a default block set", () => {
		expect(new BlockSet(undefined).getData()).toStrictEqual(defaultBlockSetData)
	})

	it("Objects retain their valid property names and lose invalid ones", () => {

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
				{ type: "ytCategory", value: { id: "categoryid", name: "testcategory" } },
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
					{ id: "categoryid", name: "testcategory" },
				],
			},
		}

		expect(new BlockSet(testBlockSetObj).getData()).toMatchObject(testBlockSetObjResult)
	})

	test("V0 \"*\"-characters get escaped when converting to V1", () => {

		const testBlockSetObj = {
			whitelist: [
				{ type: "urlEquals", value: "*te*st*" },
				{ type: "urlContains", value: "*te*st*" },
			],
		}

		const testBlockSetObjResult = {
			whitelist: {
				urlPatterns: [
					"\\*te\\*st\\*",
					"*\\*te\\*st\\**",
				],
			},
		}

		expect(new BlockSet(testBlockSetObj).getData()).toMatchObject(testBlockSetObjResult)
	})
})