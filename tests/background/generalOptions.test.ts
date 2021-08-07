import { BrowserStorage } from "@src/background/browserStorage"
import { GeneralOptions } from "@src/background/generalOptions"
import { createDefaultGeneralOptionsData } from "@src/background/generalOptionsParser"
import { ChangedEvent } from "@src/background/observer"
import { ParseError } from "@src/background/parserHelpers"
import { err, ok } from "neverthrow"
import { insertMockBrowserStorageDefaults } from "../testHelpers/mockDefaults"
import { mocked } from "ts-jest/utils"
import { GeneralOptionsData } from "@src/background/generalOptionsParseTypes"

jest.mock("webextension-polyfill-ts", () => ({}))
jest.mock("@src/background/browserStorage")

insertMockBrowserStorageDefaults(BrowserStorage.prototype)
const mockBrowserStorage = mocked(BrowserStorage, true)

let browserStorage: BrowserStorage

beforeEach(() => {
	browserStorage = new BrowserStorage({ preferSync: true })
})

afterEach(() => jest.clearAllMocks())

describe("test GeneralOptions construction", () => {
	const testGOData: GeneralOptionsData = {
		...createDefaultGeneralOptionsData(),
		typingTestWordCount: 42,
	}

	test("loads general settings from browser storage", async () => {
		mockBrowserStorage.prototype.fetchGeneralOptionsData.mockResolvedValueOnce(ok(testGOData))
		const generalOptions = await GeneralOptions.create(browserStorage)
		expect(generalOptions.data).toEqual(testGOData)
	})

	test("loads default settings if storage returns errors", async () => {
		mockBrowserStorage.prototype.fetchGeneralOptionsData.mockResolvedValueOnce(
			err(new ParseError())
		)
		const generalOptions = await GeneralOptions.create(browserStorage)
		expect(generalOptions.data).toEqual(createDefaultGeneralOptionsData())
	})
})

describe("test GeneralOptions setters", () => {
	const changedEventOf = <T>(value: T): ChangedEvent<T> => ({ newValue: value })

	let generalOptions: GeneralOptions
	const listener = jest.fn()
	beforeEach(async () => {
		generalOptions = await GeneralOptions.create(browserStorage)
	})

	test.each([
		["theme", "dark"],
		["clockType", 12],
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	])("test setter '%s'", async (key: any, value: any) => {
		generalOptions.subscribeChanged(key, listener)
		await generalOptions.set(key, value)
		expect(browserStorage.saveGeneralOptionsData).toBeCalledWith(generalOptions.data)
		expect(listener).toBeCalledWith(changedEventOf(value))
	})
})
