import { BrowserStorage, StorageSetSuccess } from "@src/background/browserStorage"
import { createDefaultGeneralOptionsData } from "@src/background/generalOptionsParser"
import { okAsync, ok } from "neverthrow"

/** Inserts default mock functions to prototype */
export const insertMockBrowserStorageDefaults = (prototype: BrowserStorage): void => {
	prototype.fetchBlockSets = jest.fn().mockResolvedValue([])
	prototype.saveNewBlockSet = jest.fn().mockReturnValue(okAsync(StorageSetSuccess.Completed))
	prototype.deleteBlockSet = jest.fn().mockReturnValue(okAsync(StorageSetSuccess.Completed))
	prototype.fetchGeneralOptionsData = jest.fn()
		.mockResolvedValue(ok(createDefaultGeneralOptionsData()))
	prototype.saveGeneralOptionsData = jest.fn().mockReturnValue(okAsync(StorageSetSuccess.Completed))
}