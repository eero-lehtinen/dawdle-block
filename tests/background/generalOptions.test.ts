import { BrowserStorage } from "@src/background/browserStorage"
import { GeneralOptions } from "@src/background/generalOptions"
import { 
	createDefaultGeneralOptionsData, GeneralOptionsData, 
} from "@src/background/generalOptionsParser"
import { ok } from "neverthrow"
import { mocked } from "ts-jest/utils"

jest.mock("webextension-polyfill-ts", () => ({}))
jest.mock("@src/background/browserStorage")

const browserStorageMock = mocked(BrowserStorage, true)

afterEach(() =>	jest.clearAllMocks())

describe("test BlockSets construction", () => {
	const browserStorage = new BrowserStorage({ preferSync: true })
	const testGOData: GeneralOptionsData = {
		...createDefaultGeneralOptionsData(),
		typingTestWordCount: 42,
	}
	
	test("loads general settings from browser storage", async() => {
		browserStorageMock.prototype.fetchGeneralOptionsData.mockResolvedValueOnce(ok(testGOData))
		const generalOptions = await GeneralOptions.create(browserStorage)
		expect(generalOptions.data).toEqual(testGOData)
	})
})