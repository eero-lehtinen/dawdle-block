import { BrowserStorage, StorageSetSuccess } from "@src/background/browserStorage"
import { GeneralOptions } from "@src/background/generalOptions"
import { 
	createDefaultGeneralOptionsData, GeneralOptionsData, 
} from "@src/background/generalOptionsParser"
import { ChangedEvent } from "@src/background/observer"
import { ParseError } from "@src/background/parserHelpers"
import { err, ok, okAsync } from "neverthrow"
import { mocked } from "ts-jest/utils"

jest.mock("webextension-polyfill-ts", () => ({}))
jest.mock("@src/background/browserStorage")

const mockBrowserStorage = mocked(BrowserStorage, true)
mockBrowserStorage.prototype.fetchGeneralOptionsData
	.mockResolvedValue(ok(createDefaultGeneralOptionsData()))
mockBrowserStorage.prototype.saveGeneralOptionsData
	.mockReturnValue(okAsync(StorageSetSuccess.Completed))

let browserStorage: BrowserStorage

beforeEach(() => {
	browserStorage = new BrowserStorage({ preferSync: true })
})

afterEach(() =>	jest.clearAllMocks())

describe("test GeneralOptions construction", () => {

	const testGOData: GeneralOptionsData = {
		...createDefaultGeneralOptionsData(),
		typingTestWordCount: 42,
	}
	
	test("loads general settings from browser storage", async() => {
		mockBrowserStorage.prototype.fetchGeneralOptionsData.mockResolvedValueOnce(ok(testGOData))
		const generalOptions = await GeneralOptions.create(browserStorage)
		expect(generalOptions.data).toEqual(testGOData)
	})

	test("loads default settings if storage returns errors", async() => {
		mockBrowserStorage.prototype.fetchGeneralOptionsData
			.mockResolvedValueOnce(err(new ParseError()))
		const generalOptions = await GeneralOptions.create(browserStorage)
		expect(generalOptions.data).toEqual(createDefaultGeneralOptionsData())
	})
})

describe("test GeneralOptions setters", () => {
	const changedEventOf = <T>(value: T): ChangedEvent<T> => ({ newValue: value })
	
	let generalOptions: GeneralOptions 
	beforeEach(async() => {
		generalOptions = await GeneralOptions.create(browserStorage)
	})
	
	test("setTheme", async() => {
		const listener = jest.fn()
		generalOptions.subscribeChanged("theme", listener)
		await generalOptions.setTheme("dark")
		expect(browserStorage.saveGeneralOptionsData).toBeCalledWith(generalOptions.data)
		expect(listener).toBeCalledWith(changedEventOf("dark"))
	})
})