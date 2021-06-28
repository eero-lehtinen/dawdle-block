/**
 * @file Contains BlockSet class implementation.
 */

import { BlockSetData, plainToBlockSetData, createDefaultBlockSet, BlockList } 
	from "./blockSetParser"
import { ytCategoryNamesById } from "./constants"
import { fetchChannelTitle } from "./youtubeAPI"

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

export class BlockSet {
	private data: BlockSetData
	private id: number
	getId(): number {
		return this.id
	}

	private timeElapsed: number
	getTimeElapsed(): number {
		return this.timeElapsed
	}

	// Blocking rules compiled to regular expressions (doesn't include yt rules)
	private compiledUrlRules: CompiledRules = { 
		blacklist: [], 
		whitelist: [],
	}

	/**
	 * Requires an unique (enforce outside of this class) id.
	 * Parses blocksetPlanObject and initializes internal state to match that.
	 * timeElapsed isn't stored in plain object, so we need to supply it seperately.
	 * @throws {Error} if object is not parseable
	 * @param id unique id
	 * @param blocksetPlanObject 
	 * @param timeElapsed blocking time elapsed
	 */
	constructor(id: number, blocksetPlanObject?: unknown, timeElapsed?: number) {
		this.id = id

		if (blocksetPlanObject === undefined)
			this.data = createDefaultBlockSet()
		else 
			this.data = plainToBlockSetData(blocksetPlanObject)

		this.timeElapsed = timeElapsed ?? 0

		this.compileRules()
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
			...this.data[listType].urlRegExps.map((value: string) => new RegExp(value)),
			...this.data[listType].urlPatterns.map((value: string) => BlockSet.patternToRegExp(value)),
		]
	}

	/**
	 * Get internal state of data for saving purposes.
	 * @returns js object
	 */
	getData(): BlockSetData {
		return this.data
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
		const from = this.data.activeTime.from
		const to = this.data.activeTime.to

		if (from === to) {
			return true
		}
		else if (from < to) {
			return (msSinceMidnight > from && msSinceMidnight < to)
		}
		else {
			return (msSinceMidnight > from || msSinceMidnight < to)
		}
	}

	/**
	 * @param weekdayNumber numbers 0 to 6
	 * @returns true if supplied weekdayNumber is set to active, false otherwise
	 */
	isInActiveWeekday(weekdayNumber: number): boolean {
		return this.data.activeDays[weekdayNumber] ?? false
	}

	/**
	 * Add pattern to block set.
	 * @param listType whitelist or blacklist
	 * @param pattern pattern to add
	 * @throws "Can't add duplicate" if the rule already exists
	 */
	addPattern(listType: ListType, pattern: string): void {
		if (this.data[listType].urlPatterns.includes(pattern)) throw new Error("Can't add duplicate")
		this.data[listType].urlPatterns.push(pattern)
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
		this.data[listType].urlPatterns = this.data[listType].urlPatterns.filter((p) => p !== pattern)
	}	

	/**
	 * Add regular expession to block set
	 * @param listType whitelist or blacklist
	 * @param regExp regular expression to add
	 * @throws "Can't add duplicate" if the rule already exists
	 */
	addRegExp(listType: ListType, regExp: string): void {
		if (this.data[listType].urlRegExps.includes(regExp)) throw new Error("Can't add duplicate")
		const compiledRegExp = new RegExp(regExp)
		this.data[listType].urlRegExps.push(regExp)
		this.compiledUrlRules[listType].push(compiledRegExp)
	}
	
	/**
	 * Remove regular expession from block set.
	 * @param listType whitelist or blacklist
	 * @param regExp regular expression to remove
	 */
	removeRegExp(listType: ListType, regExp: string): void {
		this.compiledUrlRules[listType] = this.compiledUrlRules[listType]
			.filter((c) => c.source !== regExp)
		this.data[listType].urlRegExps = this.data[listType].urlRegExps.filter((r) => r !== regExp)
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

		if (this.data[listType].ytCategoryIds.includes(categoryId)) {
			throw new Error("Can't add duplicate")
		}

		this.data[listType].ytCategoryIds.push(categoryId)
	}

	
	/**
	 * Remove YouTube category from block set.
	 * @param listType whitelist or blacklist
	 * @param categoryId category id to remove
	 */
	removeYTCategory(listType: ListType, categoryId: string): void {
		this.data[listType].ytCategoryIds = this.data[listType].ytCategoryIds
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
		if (this.data[listType].ytChannels.find(({ id }) => id === channelId)) {
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

		this.data[listType].ytChannels.push({ id: channelId, title: channelTitle })
	}

	/**
	 * Remove YouTube channel from block set.
	 * @param listType whitelist or blacklist
	 * @param channelId channel id to remove
	 */
	removeYTChannel(listType: ListType, channelId: string): void {
		this.data[listType].ytChannels = this.data[listType].ytChannels
			.filter(({ id }) => id !== channelId)
	}
	
	getBlockList(listType: ListType): BlockList {
		return this.data[listType]
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
	 * Helper function for testing both whitelist and blacklist.
	 */
	private testList(listType: ListType, url: string, channelId: string | null, 
		categoryId: string | null): boolean {
		if (this.compiledUrlRules[listType].some((regExp) => regExp.test(url)))
			return true
		if (channelId !== null && this.data[listType].ytChannels.some(({ id }) => id === channelId))
			return true
		if (categoryId !== null && this.data[listType].ytCategoryIds.some((id) => id === categoryId))
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
			string = "^" + string
		}
		if (!string.endsWith(".*")) {
			string = string + "$"
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
}