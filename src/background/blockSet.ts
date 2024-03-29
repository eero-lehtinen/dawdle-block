import { plainToBlockSetData, createDefaultBlockSetData } from "./blockSetParser"
import { BlockSetData, BlockList } from "./blockSetParseTypes"
import { ytCategoryNamesById } from "./constants"
import { fetchChannelTitle, FetchError } from "./youtubeAPI"
import { ChangedEvent, ListenerOf, Observer } from "./observer"
import { err, ok, Result } from "neverthrow"
import { ParseError, ZodRes } from "./parserHelpers"

export enum ListType {
	Blacklist = "blacklist",
	Whitelist = "whitelist",
}

export enum BlockTestRes {
	Blacklisted,
	Whitelisted,
	Ignored,
}

type CompiledRules = Record<ListType, RegExp[]>

export enum BSState {
	TimeLeft,
	Block,
	OverTime,
}

type SettableData = Omit<BlockSetData, "v" | "blacklist" | "whitelist"> & {
	timeElapsed: number
}

type ChangeObservers = {
	[Property in keyof SettableData]: Observer<ChangedEvent<SettableData[Property]>>
} & {
	any: Observer<ChangedEvent<BlockSet>>
	timeElapsed: Observer<ChangedEvent<number>>
}

type BlockListChangeObservers = {
	[T in ListType]: {
		[Property in keyof BlockList]: Observer<ChangedEvent<BlockList[Property]>>
	}
}

/* eslint-disable jsdoc/require-jsdoc */
export class AddError extends Error {}
export class DuplicateAddError extends AddError {}
export class InvalidRegExpAddError extends AddError {}
export class InvalidYTCategoryIdAddError extends AddError {}
/* eslint-enable jsdoc/require-jsdoc */

const safeMakeRegExp: (regExpStr: string) => Result<RegExp, InvalidRegExpAddError> =
	Result.fromThrowable(
		re => new RegExp(re),
		err => new InvalidRegExpAddError((err as Error).message)
	)

/**
 * Contains all configuration for website blocking.
 * Instances should be managed with the BlockSetManager.
 * Has function for testing a URL against all rules.
 */
export class BlockSet {
	private _data: BlockSetData
	private _id: number
	private _timeElapsed: number

	// Blocking rules compiled to regular expressions (doesn't include yt rules)
	private compiledUrlRules: CompiledRules = {
		blacklist: [],
		whitelist: [],
	}

	/**
	 * Requires an unique (enforce outside of this class) id.
	 * Parses blockSetPlanObject and initializes internal state to match that.
	 * timeElapsed isn't stored in plain object, so we need to supply it separately.
	 * @param id unique id
	 * @param blockSetPlanObject
	 * @param timeElapsed blocking time elapsed
	 */
	private constructor(id: number, data: BlockSetData, timeElapsed: number) {
		this._id = id
		this._data = data
		this._timeElapsed = timeElapsed

		this.compileRules()
	}

	/**
	 * Requires an unique (enforce outside of this class) id.
	 * Parses blockSetPlanObject and initializes internal state to match that.
	 * timeElapsed isn't stored in plain object, so we need to supply it separately.
	 */
	static create(
		id: number,
		blockSetPlanObject: unknown,
		timeElapsed = 0
	): ZodRes<BlockSet, ParseError> {
		return plainToBlockSetData(blockSetPlanObject).map(
			data => new BlockSet(id, data, timeElapsed)
		)
	}

	/**
	 * Requires an unique (enforce outside of this class) id.
	 * Creates a block set with default values.
	 */
	static createDefault(id: number): BlockSet {
		return new BlockSet(id, createDefaultBlockSetData(), 0)
	}

	/**
	 * Compile user written block rules into machine friendly regular expressions.
	 * @param listType whitelist or blacklist (if not set, do both)
	 */
	private compileRules(listType?: ListType): void {
		if (!listType) {
			this.compileRules(ListType.Whitelist)
			this.compileRules(ListType.Blacklist)
			return
		}
		this.compiledUrlRules[listType] = [
			...this._data[listType].urlRegExps.map((value: string) => new RegExp(value)),
			...this._data[listType].urlPatterns.map((value: string) =>
				BlockSet.patternToRegExp(value)
			),
		]
	}

	/**
	 * If from is less than to, returns true when msSinceMidnight is between user
	 * defined active time to and from.
	 * If from is greater than to, active time is effectively over night
	 * eg. from 22.00 at night to 7.00 in the morning and returns are reversed.
	 * @param msSinceMidnight milliseconds starting from today 00:00 o'clock
	 * @returns true if in active time, false otherwise
	 */
	isInActiveTime(msSinceMidnight: number): boolean {
		const from = this._data.activeTime.from
		const to = this._data.activeTime.to

		if (from === to) {
			return true
		} else if (from < to) {
			return msSinceMidnight > from && msSinceMidnight < to
		}
		return msSinceMidnight > from || msSinceMidnight < to
	}

	/**
	 * @param weekdayNumber numbers 0 to 6
	 * @returns true if supplied weekdayNumber is set to active, false otherwise
	 */
	isInActiveWeekday(weekdayNumber: number): boolean {
		return this._data.activeDays[weekdayNumber] ?? false
	}

	/**
	 * Add pattern to block set.
	 * @param listType whitelist or blacklist
	 * @param pattern pattern to add
	 */
	addPattern(listType: ListType, pattern: string): Result<void, DuplicateAddError> {
		if (this._data[listType].urlPatterns.includes(pattern))
			return err(new DuplicateAddError(`Pattern "${pattern}" already exists`))
		this._data[listType].urlPatterns.push(pattern)
		this.compiledUrlRules[listType].push(BlockSet.patternToRegExp(pattern))

		this.blockListChangeObservers[listType].urlPatterns.publish({
			newValue: this._data[listType].urlPatterns,
		})
		this.changeObservers.any.publish({ newValue: this })
		return ok(undefined)
	}

	/**
	 * Remove pattern from block set.
	 * @param listType whitelist or blacklist
	 * @param pattern pattern to remove
	 */
	removePattern(listType: ListType, pattern: string): boolean {
		const idx = this._data[listType].urlPatterns.indexOf(pattern)
		if (idx < 0) return false

		this._data[listType].urlPatterns.splice(idx, 1)

		const compiled = BlockSet.patternToRegExp(pattern as string)
		this.compiledUrlRules[listType] = this.compiledUrlRules[listType].filter(
			c => c.source !== compiled.source
		)

		this.blockListChangeObservers[listType].urlPatterns.publish({
			newValue: this._data[listType].urlPatterns,
		})
		this.changeObservers.any.publish({ newValue: this })
		return true
	}

	/**
	 * Add regular expression to block set
	 * @param listType whitelist or blacklist
	 * @param regExpStr regular expression to add
	 */
	addRegExp(
		listType: ListType,
		regExpStr: string
	): Result<void, DuplicateAddError | InvalidRegExpAddError> {
		if (this._data[listType].urlRegExps.includes(regExpStr))
			return err(new DuplicateAddError(`Regular Expression "${regExpStr}" already exists`))

		return safeMakeRegExp(regExpStr).map(regExp => {
			this._data[listType].urlRegExps.push(regExpStr)
			this.compiledUrlRules[listType].push(regExp)

			this.blockListChangeObservers[listType].urlRegExps.publish({
				newValue: this._data[listType].urlRegExps,
			})
			this.changeObservers.any.publish({ newValue: this })
			return undefined
		})
	}

	/**
	 * Remove regular expression from block set.
	 * @param listType whitelist or blacklist
	 * @param regExp regular expression to remove
	 */
	removeRegExp(listType: ListType, regExp: string): boolean {
		const idx = this._data[listType].urlRegExps.indexOf(regExp)
		if (idx < 0) return false

		this._data[listType].urlRegExps.splice(idx, 1)

		this.compiledUrlRules[listType] = this.compiledUrlRules[listType].filter(
			c => c.source !== regExp
		)

		this.blockListChangeObservers[listType].urlRegExps.publish({
			newValue: this._data[listType].urlRegExps,
		})
		this.changeObservers.any.publish({ newValue: this })
		return true
	}

	/**
	 * Add YouTube category to block set
	 * @param listType whitelist or blacklist
	 * @param categoryId category id to add
	 */
	addYTCategory(
		listType: ListType,
		categoryId: string
	): Result<void, InvalidYTCategoryIdAddError | DuplicateAddError> {
		if (this._data[listType].ytCategoryIds.includes(categoryId))
			return err(new DuplicateAddError(`YouTube category id "${categoryId}" already exists`))

		if (!(categoryId in ytCategoryNamesById)) return err(new InvalidYTCategoryIdAddError())

		this._data[listType].ytCategoryIds.push(categoryId)

		this.blockListChangeObservers[listType].ytCategoryIds.publish({
			newValue: this._data[listType].ytCategoryIds,
		})
		this.changeObservers.any.publish({ newValue: this })

		return ok(undefined)
	}

	/**
	 * Remove YouTube category from block set.
	 * @param listType whitelist or blacklist
	 * @param categoryId category id to remove
	 */
	removeYTCategory(listType: ListType, categoryId: string): boolean {
		const idx = this._data[listType].ytCategoryIds.indexOf(categoryId)
		if (idx < 0) return false

		this._data[listType].ytCategoryIds.splice(idx, 1)

		this.blockListChangeObservers[listType].ytCategoryIds.publish({
			newValue: this._data[listType].ytCategoryIds,
		})
		this.changeObservers.any.publish({ newValue: this })
		return true
	}

	/**
	 * Add YouTube channel to block set. Validates channelId and finds channel title based on it.
	 * @param listType whitelist or blacklist
	 * @param channelId channel id to add
	 */
	async addYTChannel(
		listType: ListType,
		channelId: string
	): Promise<Result<void, DuplicateAddError | FetchError>> {
		if (this._data[listType].ytChannels.find(({ id }) => id === channelId)) {
			return err(new DuplicateAddError(`YouTube channel id "${channelId}" already exists`))
		}

		const titleResult = await fetchChannelTitle(channelId)
		if (titleResult.isErr()) return err(titleResult.error)

		this._data[listType].ytChannels.push({ id: channelId, title: titleResult.value })

		this.blockListChangeObservers[listType].ytChannels.publish({
			newValue: this._data[listType].ytChannels,
		})
		this.changeObservers.any.publish({ newValue: this })

		return ok(undefined)
	}

	/**
	 * Remove YouTube channel from block set.
	 * @param listType whitelist or blacklist
	 * @param channelId channel id to remove
	 */
	removeYTChannel(listType: ListType, channelId: string): boolean {
		const idx = this._data[listType].ytChannels.findIndex(({ id }) => id === channelId)
		if (idx < 0) return false

		this._data[listType].ytChannels.splice(idx, 1)

		this.blockListChangeObservers[listType].ytChannels.publish({
			newValue: this._data[listType].ytChannels,
		})
		this.changeObservers.any.publish({ newValue: this })
		return true
	}

	/**
	 * Moves a block list rule from `fromIndex` to `toIndex`.
	 * If any of the indices are less than zero or more than length of the array,
	 * nothing happens.
	 */
	moveBlockListRule<K extends keyof BlockList>(
		listType: ListType,
		listKey: K,
		fromIndex: number,
		toIndex: number
	): void {
		const arr = this._data[listType][listKey]

		if (toIndex < 0 || toIndex >= arr.length || fromIndex === toIndex) return

		const element = arr[fromIndex]

		if (element === undefined) return

		arr.splice(fromIndex, 1)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		arr.splice(toIndex, 0, element as any)

		this.blockListChangeObservers[listType][listKey].publish({
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			newValue: this._data[listType][listKey] as any,
		})
		this.changeObservers.any.publish({ newValue: this })
	}

	/**
	 * Test if url, channelId or categoryId matches with any whitelist or blacklist.
	 * @param urlNoProtocol url to test (protocol not allowed)
	 * @param channelId channel id to test against
	 * @param categoryId category id to test against
	 */
	test(
		urlNoProtocol: string,
		channelId: string | null,
		categoryId: string | null
	): BlockTestRes {
		if (this.testList(ListType.Whitelist, urlNoProtocol, channelId, categoryId)) {
			return BlockTestRes.Whitelisted
		}

		if (this.testList(ListType.Blacklist, urlNoProtocol, channelId, categoryId)) {
			return BlockTestRes.Blacklisted
		}

		return BlockTestRes.Ignored
	}

	/**
	 * Compare supplied state to current blocking state of this block set.
	 * Has specialized behaviour when annoyMode is true.
	 * When multiple parameters are provided, returns true if any of them match.
	 */
	isInState(...states: BSState[]): boolean {
		return states.some(state => {
			if (this._timeElapsed < this._data.timeAllowed) {
				return state === BSState.TimeLeft
			}
			// annoyMode == false
			if (!this._data.annoyMode) {
				return state === BSState.Block
			}
			// annoyMode == true
			if (this._timeElapsed === this._data.timeAllowed) return state === BSState.TimeLeft
			return state === BSState.OverTime
		})
	}

	/**
	 * Helper function for testing both whitelist and blacklist.
	 */
	private testList(
		listType: ListType,
		url: string,
		channelId: string | null,
		categoryId: string | null
	): boolean {
		if (this.compiledUrlRules[listType].some(regExp => regExp.test(url))) return true
		if (
			channelId !== null &&
			this._data[listType].ytChannels.some(({ id }) => id === channelId)
		)
			return true
		if (categoryId !== null && this._data[listType].ytCategoryIds.some(id => id === categoryId))
			return true

		return false
	}

	/**
	 * Escape user defined strings to be used in regular expressions for exact matching with
	 * wildcards. Part of regular expression copied from MDN
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping.
	 * @param string string to escape
	 * @returns escaped string
	 */
	static patternToRegExp(string: string): RegExp {
		string = string.replace(/(\\\*)|(\*)|([.+?^${}()|[\]\\])/g, (_, g1, g2, g3): string => {
			// If we found an escaped wildcard, just return it
			if (g1 !== undefined) return g1

			// If we found an unescaped wildcard, replace it with a regular expression wildcard
			if (g2 !== undefined) return ".*"

			// Otherwise just escape the forbidden character
			return `\\${g3}`
		})

		if (!string.startsWith(".*")) {
			string = `^${string}`
		}
		if (!string.endsWith(".*")) {
			string = `${string}$`
		}

		return new RegExp(string)
	}

	/**
	 * Escape characters reserved for patterns. Currently only * and \.
	 * Useful when converting raw urls (that may contain reserved characters) into patterns.
	 * @param string string to escape
	 * @returns escaped string safe to use as pattern
	 */
	static urlToPattern(string: string): string {
		return string.replace(/[*\\]/g, "\\$&")
	}

	/**
	 * Get internal state of data for saving purposes.
	 * @returns js object
	 */
	get data(): BlockSetData {
		return this._data
	}

	get id(): number {
		return this._id
	}

	get timeElapsed(): number {
		return this._timeElapsed
	}

	get overtime(): number {
		return -this.timeLeft
	}

	get timeLeft(): number {
		return this._data.timeAllowed - this.timeElapsed
	}

	private readonly changeObservers: ChangeObservers = {
		timeElapsed: new Observer(),
		name: new Observer(),
		requireActive: new Observer(),
		annoyMode: new Observer(),
		timeAllowed: new Observer(),
		resetTime: new Observer(),
		lastReset: new Observer(),
		activeDays: new Observer(),
		activeTime: new Observer(),
		any: new Observer(),
	}

	/**
	 * Subscribe to changes of any allowed property in general options.
	 * @returns unsubscribe function
	 */
	subscribeChanged<K extends keyof ChangeObservers>(
		key: K,
		listener: ListenerOf<ChangeObservers[K]>
	): () => void {
		return this.changeObservers[key].subscribe(listener as ListenerOf<ChangeObservers[K]>)
	}

	private readonly blockListChangeObservers: BlockListChangeObservers = {
		blacklist: {
			urlPatterns: new Observer(),
			urlRegExps: new Observer(),
			ytChannels: new Observer(),
			ytCategoryIds: new Observer(),
		},
		whitelist: {
			urlPatterns: new Observer(),
			urlRegExps: new Observer(),
			ytChannels: new Observer(),
			ytCategoryIds: new Observer(),
		},
	}

	/**
	 * Subscribe to changes of any allowed property in general options.
	 * @returns unsubscribe function
	 */
	subscribeBlockListChanged<
		LS extends keyof BlockListChangeObservers,
		K extends keyof BlockList,
		L extends ListenerOf<BlockListChangeObservers[LS][K]>
	>(listType: LS, listKey: K, listener: L): () => void {
		return this.blockListChangeObservers[listType][listKey].subscribe(listener as L)
	}

	/**
	 * Set any settable value with type safety.
	 * Saves value to storage.
	 */
	set<K extends keyof SettableData>(key: K, newValue: SettableData[K]): void {
		if (key === "timeElapsed") {
			this._timeElapsed = newValue as number
		} else {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			;(this.data as any)[key] = newValue
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		this.changeObservers[key].publish({ newValue } as any)
		this.changeObservers.any.publish({ newValue: this })
	}
}
