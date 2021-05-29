import { plainToBlockSet, createDefaultBlockSet } from "../src/scripts/block-set"

describe("createDefaultBlockSet function", () => {
	test("Non-objects throw", () => {

		expect(() => { plainToBlockSet(undefined) }).toThrow()
		expect(() => { plainToBlockSet(null) }).toThrow()
		expect(() => { plainToBlockSet("string") }).toThrow()
		expect(() => { plainToBlockSet(42) }).toThrow()
		expect(() => { plainToBlockSet(false) }).toThrow()
	})

	test("Objects with invalid types get rejeted and throw", () => {

		const testBlockSetObj = {
			requireActive: "string", 
			activeDays: undefined
		}

		expect(() => { plainToBlockSet(testBlockSetObj)}).toThrow()
	})

	test("Empty objects get filled with defaults", () => {
		expect(plainToBlockSet({})).toStrictEqual(createDefaultBlockSet())
	})

	test("Objects retain their valid property names and lose invalid ones", () => {

		const testBlockSetObj = {
			name: "retained", 
			loseMe: "lost"
		}

		const blockSet = plainToBlockSet(testBlockSetObj)

		expect(blockSet).toHaveProperty("name")
		expect(blockSet).not.toHaveProperty("loseMe")
	})

	test("V0 block sets get converted to V1", () => {

		const testBlockSetObj = {
			blacklist: [
				{ type: "urlEquals", value: "test" },
				{ type: "urlContains", value: "test" },
				{ type: "urlPrefix", value: "test" },
				{ type: "urlSuffix", value: "test" },
				{ type: "urlRegexp", value: "test" },
			]
		}

		const testBlockSetObjResult = {
			blacklist: [
				{ type: "urlPattern", value: "test" },
				{ type: "urlPattern", value: "*test*" },
				{ type: "urlPattern", value: "test*" },
				{ type: "urlPattern", value: "*test" },
				{ type: "urlRegexp", value: "test" },
			]
		}

		expect(plainToBlockSet(testBlockSetObj)).toMatchObject(testBlockSetObjResult)
	})
})