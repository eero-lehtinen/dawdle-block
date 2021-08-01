import { ok, ResultAsync } from "neverthrow"
import { BrowserStorage, StorageSetError, StorageSetSuccess } from "./browserStorage"
import {
	createDefaultGeneralOptionsData, GeneralOptionsData,
} from "./generalOptionsParser"
import { ChangedEvent, ListenerOf, Observer } from "./observer"



type SettableData = Pick<GeneralOptionsData, "theme" | "clockType">

type ChangeObservers = {
	[Property in keyof SettableData]: 
		Observer<ChangedEvent<SettableData[Property]>>
}

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
		const res = await browserStorage.fetchGeneralOptionsData()
		if (res.isErr())
			return new GeneralOptions(browserStorage)
		return new GeneralOptions(browserStorage, res.value)
	}

	/**
	 * Assigns new instance of general options data to this object.
	 * Pass undefined to get defaults. */
	assignData(generalOptionsData?: GeneralOptionsData): void {
		if (generalOptionsData === undefined)
			this._data = createDefaultGeneralOptionsData()
		else
			this._data = generalOptionsData
	}

	get data(): GeneralOptionsData {
		return this._data
	}

	private readonly changeObservers: ChangeObservers = {
		theme: new Observer(),
		clockType: new Observer(),
	}

	/**
	 * Subscribe to changes of any allowed property in general options.
	 * @returns unsubscribe function
	 */
	subscribeChanged<K extends keyof ChangeObservers>(
		key: K, listener: ListenerOf<ChangeObservers[K]>): () => void {
		return this.changeObservers[key].subscribe(listener as ListenerOf<ChangeObservers[K]>)
	}

	/** 
	 * Set any settable value with type safety. 
	 * Saves value to storage. 
	 */
	set<K extends keyof SettableData>(
		key: K, newValue: GeneralOptionsData[K]):
		ResultAsync<StorageSetSuccess, StorageSetError> {
		return this.browserStorage.saveGeneralOptionsData(
			{ ...this._data, [key]: newValue })
			.andThen(res => {
				this.data[key] = newValue
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				this.changeObservers[key].publish({ newValue } as any)
				return ok(res)
			})
	}
}