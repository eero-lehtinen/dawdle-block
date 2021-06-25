import { plainToGeneralOptions, createDefaultGeneralOptions } 
	from "../src/scripts/background/generalOptionsParser"

describe("test GeneralOptions parsing", () => {
	const defaultGeneralOptions = createDefaultGeneralOptions()

	it("basic example is parsed", () => {
		const testOptionsObj = {
			v: 1,
			clockType: 12,
			displayHelp: false,
			darkTheme: true,
			settingProtection: "always",
			typingTestWordCount: 100,
		}

		expect(plainToGeneralOptions(testOptionsObj)).toStrictEqual(testOptionsObj)
	})

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

	it("undefined creates a default general options", () => {
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