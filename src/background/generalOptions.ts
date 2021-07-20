import { BrowserStorage } from "./browserStorage"
import { 
	createDefaultGeneralOptionsData, GeneralOptionsData, plainToGeneralOptionsData, 
} from "./generalOptionsParser"


/**
 * Class for storing general options. Contains means for loading and saving to browser storage.
 */
export class GeneralOptions {
	private _data!: GeneralOptionsData
	private browserStorage: BrowserStorage

	/** Assigns browser storage and assigns data */
	private constructor(browserStorage: BrowserStorage, generalOptionsData?: GeneralOptionsData) {
		this.browserStorage = browserStorage
		this.assignData(generalOptionsData)
	}

	/**
	 * Creates and initializes a GeneralOptions.
	 * Loads general options data from browser storage.
	 * @param browserStorage
	 * @returns new instance of GeneralOptions
	 */
	static async create(browserStorage: BrowserStorage): Promise<GeneralOptions> {
		const instance = new GeneralOptions(
			browserStorage, await browserStorage.fetchGeneralOptionsData())
		return instance
	}

	/**
	 * Assigns new instance of general options data to this object.
	 * Pass undefined to get defaults.
	 * @param generalOptionsData 
	 * @Throws Error if data is invalid
	 */
	assignData(generalOptionsData?: GeneralOptionsData): void {
		if (generalOptionsData === undefined)
			this._data = createDefaultGeneralOptionsData()
		else
			this._data = plainToGeneralOptionsData(generalOptionsData)
	}

	get data(): GeneralOptionsData {
		return this._data
	}
}