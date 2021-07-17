import { 
	BlockSetData, plainToBlockSetData, createDefaultBlockSetData, 
	BlockList, ActiveTime, ActiveDays,
} from "./blockSetParser"
import { ytCategoryNamesById } from "./constants"
import { fetchChannelTitle } from "./youtubeAPI"
import { Listener, Observer } from "./observer"

export enum ListType {
	Blacklist = "blacklist",
	Whitelist = "whitelist",
}

export enum BlockTestRes {
	Blacklisted,
	Whitelisted,
	Ignored
}

type CompiledRules = Record<ListType, RegExp[]>

export type ChangedEvent<T> = {
	newValue: T
}

export enum BlockSetState {
	TimeLeft,
	Block,
	OverTime,
}

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
	 * Parses blocksetPlanObject and initializes internal state to match that.
	 * timeElapsed isn't stored in plain object, so we need to supply it separately.
	 * @throws {Error} if object is not parseable
	 * @param id unique id
	 * @param blocksetPlanObject 
	 * @param timeElapsed blocking time elapsed
	 */
	constructor(id: number, blocksetPlanObject?: unknown, timeElapsed = 0) {
		this._id = id

		if (blocksetPlanObject === undefined)
			this._data = createDefaultBlockSetData()
		else 
			this._data = plainToBlockSetData(blocksetPlanObject)

		this._timeElapsed = timeElapsed

		this.compileRules()

		this.connectChangeObserverAny()
	}

	/**
	 * Compile user written block rules into machine friendly regular expressions.
	 * @param listType whitelist or blacklist (if not set, do both)
	 * 
	 */
	private compileRules(listType?: ListType): void {
		if (!listType) {
			this.compileRules(ListType.Whitelist)
			this.compileRules(ListType.Blacklist)
			return
		}
		this.compiledUrlRules[listType] = [
			...this._data[listType].urlRegExps.map((value: string) => new RegExp(value)),
			...this._data[listType].urlPatterns.map((value: string) => BlockSet.patternToRegExp(value)),
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
		}
		else if (from < to) {
			return (msSinceMidnight > from && msSinceMidnight < to)
		}
		return (msSinceMidnight > from || msSinceMidnight < to)
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
	 * @throws "Can't add duplicate" if the rule already exists
	 */
	addPattern(listType: ListType, pattern: string): void {
		if (this._data[listType].urlPatterns.includes(pattern)) throw new Error("Can't add duplicate")
		this._data[listType].urlPatterns.push(pattern)
		this.compiledUrlRules[listType].push(BlockSet.patternToRegExp(pattern))
	}

	/**
	 * Remove pattern from block set.
	 * @param listType whitelist or blacklist
	 * @param pattern pattern to remove
	 */
	removePattern(listType: ListType, pattern: string): void {
		const compiled = BlockSet.patternToRegExp(pattern as string)
		this.compiledUrlRules[listType] = this.compiledUrlRules[listType]
			.filter((c) => c.source !== compiled.source)
		this._data[listType].urlPatterns = this._data[listType].urlPatterns.filter((p) => p !== pattern)
	}	

	/**
	 * Add regular expression to block set
	 * @param listType whitelist or blacklist
	 * @param regExp regular expression to add
	 * @throws "Can't add duplicate" if the rule already exists
	 */
	addRegExp(listType: ListType, regExp: string): void {
		if (this._data[listType].urlRegExps.includes(regExp)) throw new Error("Can't add duplicate")
		const compiledRegExp = new RegExp(regExp)
		this._data[listType].urlRegExps.push(regExp)
		this.compiledUrlRules[listType].push(compiledRegExp)
	}
	
	/**
	 * Remove regular expression from block set.
	 * @param listType whitelist or blacklist
	 * @param regExp regular expression to remove
	 */
	removeRegExp(listType: ListType, regExp: string): void {
		this.compiledUrlRules[listType] = this.compiledUrlRules[listType]
			.filter((c) => c.source !== regExp)
		this._data[listType].urlRegExps = this._data[listType].urlRegExps.filter((r) => r !== regExp)
	}

	/**
	 * Add YouTube category to block set
	 * @param listType whitelist or blacklist
	 * @param categoryId category id to add
	 * @throws "Invalid YouTube category id" if category isn't found in constant ytCategoryNamesById
	 * @throws "Can't add duplicate" if the rule already exists
	 */
	addYTCategory(listType: ListType, categoryId: string): void {
		if (!(categoryId in ytCategoryNamesById)) {
			throw new Error("Invalid YouTube category id")
		}

		if (this._data[listType].ytCategoryIds.includes(categoryId)) {
			throw new Error("Can't add duplicate")
		}

		this._data[listType].ytCategoryIds.push(categoryId)
	}

	
	/**
	 * Remove YouTube category from block set.
	 * @param listType whitelist or blacklist
	 * @param categoryId category id to remove
	 */
	removeYTCategory(listType: ListType, categoryId: string): void {
		this._data[listType].ytCategoryIds = this._data[listType].ytCategoryIds
			.filter((id) => id !== categoryId)
	}

	/**
	 * Add YouTube channel to block set. Validates channelId when channelTitle in unset.
	 * Only set channelTitle when it comes from a trusted source.
	 * @param listType whitelist or blacklist
	 * @param channelId channel id to add
	 * @param channelTitle trusted channel title
	 * @throws "YouTube channel with id not found" if channel id does not exist in google servers
	 * @throws "Can't add duplicate" if the channel already exists in rules
	 */
	async addYTChannel(listType: ListType, channelId: string, channelTitle?: string): Promise<void> {
		if (this._data[listType].ytChannels.find(({ id }) => id === channelId)) {
			throw new Error("Can't add duplicate")
		}

		if (channelTitle === undefined) {
			try {
				channelTitle = await fetchChannelTitle(channelId)
			}
			catch (err) {
				throw new Error("YouTube channel with id not found")
			}
		}

		this._data[listType].ytChannels.push({ id: channelId, title: channelTitle })
	}

	/**
	 * Remove YouTube channel from block set.
	 * @param listType whitelist or blacklist
	 * @param channelId channel id to remove
	 */
	removeYTChannel(listType: ListType, channelId: string): void {
		this._data[listType].ytChannels = this._data[listType].ytChannels
			.filter(({ id }) => id !== channelId)
	}
	
	/**
	 * Get all blockrules based on list type
	 * @param listType whitelist or blacklist
	 * @returns 
	 */
	getBlockList(listType: ListType): BlockList {
		return this._data[listType]
	}

	/**
	 * Test if url, channelId or categoryId matches with any whitelist or blacklist.
	 * @param urlNoProtocol url to test (protocol not allowed)
	 * @param channelId channel id to test against
	 * @param categoryId category id to test against
	 * @returns 
	 */
	test(urlNoProtocol: string, channelId: string | null, categoryId: string | null): BlockTestRes {
		if (this.testList(ListType.Whitelist, urlNoProtocol, channelId, categoryId)) {
			return BlockTestRes.Whitelisted
		}

		if (this.testList(ListType.Blacklist, urlNoProtocol, channelId, categoryId)) {
			return BlockTestRes.Blacklisted
		}
		
		return BlockTestRes.Ignored
	}

	/** 
	 * Get current blocking state of this block set. 
	 * Has specialized behaviour when annoyMode is true.
	 */
	getState(): BlockSetState {
		if (this.timeElapsed < this._data.timeAllowed) {
			return BlockSetState.TimeLeft
		}
		if (this.timeElapsed === this._data.timeAllowed) {
			if (this._data.annoyMode) {
				return BlockSetState.TimeLeft
			}
			return BlockSetState.Block
		}
		return BlockSetState.OverTime
	}

	/**
	 * Helper function for testing both whitelist and blacklist.
	 */
	private testList(listType: ListType, url: string, channelId: string | null, 
		categoryId: string | null): boolean {
		if (this.compiledUrlRules[listType].some((regExp) => regExp.test(url)))
			return true
		if (channelId !== null && this._data[listType].ytChannels.some(({ id }) => id === channelId))
			return true
		if (categoryId !== null && this._data[listType].ytCategoryIds.some((id) => id === categoryId))
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
		string = string.replace(/(\\\*)|(\*)|([.+?^${}()|[\]\\])/g, 
			(_, g1, g2, g3): string => {
				// If we found an escaped wildcard, just return it
				if (g1 !== undefined)
					return g1

				// If we found an unescaped wildcard, replace it with a regular expression wildcard
				if (g2 !== undefined)
					return ".*"
			
				// Otherwise just escape the forbidden character
				return `\\${g3}`
			})

		if (!string.startsWith(".*")) {
			string = `^${  string}`
		}
		if (!string.endsWith(".*")) {
			string = `${string  }$`
		}

		return new RegExp(string)
	}

	/**
	 * Escape characters reserved for patterns. Currently only *.
	 * Useful when converting raw urls (that may contain reserved characters) into patterns.
	 * @param string string to escape
	 * @returns escaped string safe to use as pattern
	 */
	static urlToPattern(string: string): string {
		return string.replace(/\*/g, String.raw`\*`)
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

	/* eslint-disable jsdoc/require-jsdoc*/

	private observerTimeElapsedChanged = new Observer<ChangedEvent<number>>()
	subscribeTimeElapsedChanged(listener: Listener<ChangedEvent<number>>): () => void { 
		return this.observerTimeElapsedChanged.subscribe(listener)
	}
	get timeElapsed(): number { return this._timeElapsed }
	set timeElapsed(val: number) {
		this._timeElapsed = val
		this.observerTimeElapsedChanged.publish({ newValue: val })
	}

	private observerNameChanged = new Observer<ChangedEvent<string>>()
	subscribeNameChanged(listener: Listener<ChangedEvent<string>>): () => void { 
		return this.observerNameChanged.subscribe(listener)
	}
	get name(): string { return this._data.name}
	set name(val: string) { 
		this._data.name = val
		this.observerNameChanged.publish({ newValue: val })
	}

	private observerRequireActiveChanged = new Observer<ChangedEvent<boolean>>()
	subscribeRequireActiveChanged(listener: Listener<ChangedEvent<boolean>>): () => void { 
		return this.observerRequireActiveChanged.subscribe(listener)
	}
	get requireActive(): boolean { return this._data.requireActive}
	set requireActive(val: boolean) { 
		this._data.requireActive = val
		this.observerRequireActiveChanged.publish({ newValue: val })
	}

	private observerAnnoyModeChanged = new Observer<ChangedEvent<boolean>>()
	subscribeAnnoyModeChanged(listener: Listener<ChangedEvent<boolean>>): () => void { 
		return this.observerAnnoyModeChanged.subscribe(listener)
	}
	get annoyMode(): boolean { return this._data.annoyMode}
	set annoyMode(val: boolean) { 
		this._data.annoyMode = val
		this.observerAnnoyModeChanged.publish({ newValue: val })
	}

	private changeObserverTimeAllowed = new Observer<ChangedEvent<number>>()
	subscribeTimeAllowedChanged(listener: Listener<ChangedEvent<number>>): () => void { 
		return this.changeObserverTimeAllowed.subscribe(listener)
	}
	get timeAllowed(): number { return this._data.timeAllowed}
	set timeAllowed(val: number) { 
		this._data.timeAllowed = val
		this.changeObserverTimeAllowed.publish({ newValue: val })
	}

	private changeObserverResetTime = new Observer<ChangedEvent<number>>()
	subscribeResetTimeChanged(listener: Listener<ChangedEvent<number>>): () => void { 
		return this.changeObserverResetTime.subscribe(listener)
	}
	get resetTime(): number { return this._data.resetTime}
	set resetTime(val: number) { 
		this._data.resetTime = val
		this.changeObserverResetTime.publish({ newValue: val })
	}

	private changeObserverLastReset = new Observer<ChangedEvent<number>>()
	subscribeLastResetChanged(listener: Listener<ChangedEvent<number>>): () => void { 
		return this.changeObserverLastReset.subscribe(listener)
	}
	get lastReset(): number { return this._data.lastReset}
	set lastReset(val: number) { 
		this._data.lastReset = val
		this.changeObserverLastReset.publish({ newValue: val })
	}

	private changeObserverActiveDays = new Observer<ChangedEvent<ActiveDays>>()
	subscribeActiveDaysChanged(listener: Listener<ChangedEvent<ActiveDays>>): () => void { 
		return this.changeObserverActiveDays.subscribe(listener)
	}
	get activeDays(): ActiveDays { return this._data.activeDays}
	set activeDays(val: ActiveDays) { 
		this._data.activeDays = val
		this.changeObserverActiveDays.publish({ newValue: val })
	}

	private changeObserverActiveTime = new Observer<ChangedEvent<ActiveTime>>()
	subscribeActiveTimeChanged(listener: Listener<ChangedEvent<ActiveTime>>): () => void { 
		return this.changeObserverActiveTime.subscribe(listener)
	}
	get activeTime(): ActiveTime { return this._data.activeTime}
	set activeTime(val: ActiveTime) { 
		this._data.activeTime = val
		this.changeObserverActiveTime.publish({ newValue: val })
	}

	/** Connect any change observer to listen to all changes. 
	 * Call this only once in constructor. */
	private connectChangeObserverAny() {
		const listener = () => this.changeObserverAny.publish({ newValue: this })
		this.subscribeTimeElapsedChanged(listener)
		this.subscribeNameChanged(listener)
		this.subscribeRequireActiveChanged(listener)
		this.subscribeAnnoyModeChanged(listener)
		this.subscribeTimeAllowedChanged(listener)
		this.subscribeResetTimeChanged(listener)
		this.subscribeLastResetChanged(listener)
		this.subscribeActiveDaysChanged(listener)
		this.subscribeActiveTimeChanged(listener)
	}
	private changeObserverAny = new Observer<ChangedEvent<BlockSet>>()
	subscribeAnyChanged(listener: Listener<ChangedEvent<BlockSet>>): () => void { 
		return this.changeObserverAny.subscribe(listener)
	}
}