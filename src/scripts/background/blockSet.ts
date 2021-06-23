/**
 * @file Contains BlockSet class implementation.
 */

import { BlockSetData, plainToBlockSetData, createDefaultBlockSet, BlockList } from "./blockSetParser"

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

	// Blocking rules compiled to regular expressions (doesn't include yt rules)
	private compiledUrlRules: CompiledRules = { 
		blacklist: [], 
		whitelist: [],
	}

	/**
	 * Parses blocksetPlanObject and initializes internal state to match that.
	 * @throws {Error} if object is not parseable
	 * @param blocksetPlanObject 
	 */
	constructor(blocksetPlanObject?: unknown) {
		if (blocksetPlanObject === undefined)
			this.data = createDefaultBlockSet()
		else 
			this.data = plainToBlockSetData(blocksetPlanObject)

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
	 * If from is less than to, returns true when msSinceMidnight is between user defined active time to and from.
	 * If from is greater than to, active time is effectively over night eg. from 22.00 at night to 7.00 in the morning
	 * and returns are reversed.
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
		return !!this.data.activeDays[weekdayNumber]
	}

	/**
	 * Add pattern to block set.
	 * @param listType whitelist or blacklist
	 * @param pattern pattern to add
	 * @returns true if successful, false otherwise
	 */
	addPattern(listType: ListType, pattern: string): boolean {
		if (this.data[listType].urlPatterns.includes(pattern)) return false
		this.data[listType].urlPatterns.push(pattern)
		this.compiledUrlRules[listType].push(BlockSet.patternToRegExp(pattern))
		return true
	}

	/**
	 * Remove pattern from block set.
	 * @param listType whitelist or blacklist
	 * @param pattern pattern to remove
	 */
	removePattern(listType: ListType, pattern: string): void {
		const compiled = BlockSet.patternToRegExp(pattern as string)
		this.compiledUrlRules[listType] = this.compiledUrlRules[listType].filter((c) => c.source !== compiled.source)
		this.data[listType].urlPatterns = this.data[listType].urlPatterns.filter((p) => p !== pattern)
	}	

	/**
	 * Add regular expession to block set
	 * @param listType whitelist or blacklist
	 * @param regExp regular expression to add
	 * @returns true if successful, false otherwise
	 */
	addRegExp(listType: ListType, regExp: string): boolean {
		if (this.data[listType].urlRegExps.includes(regExp)) return false
		const compiledRegExp = new RegExp(regExp)
		this.data[listType].urlRegExps.push(regExp)
		this.compiledUrlRules[listType].push(compiledRegExp)
		return true
	}
	
	/**
	 * Remove regular expession from block set.
	 * @param listType whitelist or blacklist
	 * @param regExp regular expression to remove
	 */
	removeRegExp(listType: ListType, regExp: string): void {
		this.compiledUrlRules[listType] = this.compiledUrlRules[listType].filter((c) => c.source !== regExp)
		this.data[listType].urlRegExps = this.data[listType].urlRegExps.filter((r) => r !== regExp)
	}

	getBlockList(listType: ListType): BlockList {
		return this.data[listType]
	}

	async addYTChannel(_listType: ListType, _channelId: string): Promise<void> {
		// TODO: check channel validity from google api
	}

	async addYTCategory(_listType: ListType, _categoryId: number): Promise<void> {
		// TODO: check category validity from google api
	}

	/**
	 * Test if url, channelId or categoryId matches with any whitelist or blacklist.
	 * @param url url to test (protocol not allowed in url)
	 * @param channelId channel id to test against
	 * @param categoryId category id to test against
	 * @returns 
	 */
	test(url: string, channelId: string | null, categoryId: string | null): BlockTestRes {
		if (this.testList(ListType.Whitelist, url, channelId, categoryId)) {
			return BlockTestRes.Whitelisted
		}

		if (this.testList(ListType.Blacklist, url, channelId, categoryId)) {
			return BlockTestRes.Blacklisted
		}
		
		return BlockTestRes.Ignored
	}

	/**
	 * Helper function for testing both whitelist and blacklist.
	 */
	private testList(listType: ListType, url: string, channelId: string | null, 
		categoryId: string | null): boolean {
		return this.compiledUrlRules[listType].some((regExp) => regExp.test(url)) ||
			(channelId ? this.data[listType].ytChannels.some(({ id }) => id === channelId) : false) ||
			(categoryId ? this.data[listType].ytCategories.some(({ id }) => id === categoryId) : false)
	}

	/**
	 * Escape user defined strings to be used in regular expressions for exact matching with wildcards.
	 * Part of regular expression copied from MDN 
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping.
	 * @param string string to escape
	 * @returns escaped string
	 */
	static patternToRegExp(string: string): RegExp {
		string = string.replace(/(\\\*)|(\*)|([.+?^${}()|[\]\\])/g, 
			(_, g1, g2, g3): string => {
				// If we found an escaped wildcard, just return it
				if (g1)
					return g1

				// If we found an unescaped wildcard, replace it with a regular expression wildcard
				if (g2)
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