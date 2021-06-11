import { plainToGeneralOptions, createDefaultGeneralOptions } from "../src/scripts/background/general-options-parser"

describe("test GeneralOptions parsing", () => {
	const defaultGeneralOptions = createDefaultGeneralOptions()

	it("non-objects throw", () => {
		expect(() => { plainToGeneralOptions("string") }).toThrow()
		expect(() => { plainToGeneralOptions(42) }).toThrow()
		expect(() => { plainToGeneralOptions(() => {return 0}) }).toThrow()
		expect(() => { plainToGeneralOptions(null)}).toThrow()
	})

	it("objects with members of invalid types throw", () => {

		const testOptionsObj = {
			clockType: "string", 
			darkTheme: undefined,
		}

		expect(() => { plainToGeneralOptions(testOptionsObj)}).toThrow()
	})

	it("incomplete objects get filled with defaults", () => {
		expect(plainToGeneralOptions({})).toStrictEqual(defaultGeneralOptions)
	})

	it("undefined creates a default block set", () => {
		expect(plainToGeneralOptions(undefined)).toStrictEqual(defaultGeneralOptions)
	})

	it("objects retain their valid property names and lose invalid ones", () => {
		
		const testBlockSetObj = {
			displayHelp: true, 
			loseMe: "lost",
		}

		const generalOptions = plainToGeneralOptions(testBlockSetObj)

		expect(generalOptions).toHaveProperty("displayHelp")
		expect(generalOptions).not.toHaveProperty("loseMe")
	})
})