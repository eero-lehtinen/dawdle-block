import { BrowserStorage, StorageSetSuccess } from "@src/background/browserStorage"
import { createDefaultGeneralOptionsData } from "@src/background/generalOptionsParser"
import { okAsync } from "neverthrow"

/** Inserts default mock functions to prototype */
export const insertMockBrowserStorageDefaults = (prototype: BrowserStorage): void => {
	prototype.fetchBlockSets = jest.fn(() => Promise.resolve([]))
	prototype.saveNewBlockSet = jest.fn(() => okAsync(StorageSetSuccess.Completed))
	prototype.deleteBlockSet = jest.fn(() => okAsync(StorageSetSuccess.Completed))
	prototype.fetchGeneralOptionsData = jest.fn(() => okAsync(createDefaultGeneralOptionsData()))
	prototype.saveGeneralOptionsData = jest.fn(() => okAsync(StorageSetSuccess.Completed))
}
