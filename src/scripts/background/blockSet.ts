/**
 * @file Contains BlockSet class implementation.
 */

import { BlockSetData, plainToBlockSetData, createDefaultBlockSet } from "./blockSetParser"
import { escapeToWildcardRegExp } from "./utils"

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
	 * @param rulesType whitelist or blacklist (if not set, do both)
	 * 
	 */
	private compileRules(rulesType?: ListType): void {
		if (!rulesType) {
			this.compileRules(ListType.Whitelist)
			this.compileRules(ListType.Blacklist)
			return
		}
		this.compiledUrlRules[rulesType] = [
			...this.data[rulesType].urlRegExps.map((value: string) => new RegExp(value)),
			...this.data[rulesType].urlPatterns.map((value: string) => new RegExp(escapeToWildcardRegExp(value))),
		]
	}

	getData(): BlockSetData {
		return this.data
	}

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

	isInActiveWeekday(weekdayNumber: number): boolean {
		return !!this.data.activeDays[weekdayNumber]
	}

	addPattern(listType: ListType, pattern: string): void {
		this.data[listType].urlPatterns.push(pattern)
		this.compiledUrlRules[listType].push(new RegExp(escapeToWildcardRegExp(pattern)))
	}

	addRegExp(listType: ListType, regExp: string): void {
		this.data[listType].urlRegExps.push(regExp)
		this.compiledUrlRules[listType].push(new RegExp(regExp))
	}

	async addYTChannel(_listType: ListType, _channelId: string): Promise<void> {
		// TODO: check channel validity from google api
	}

	async addYTCategory(_listType: ListType, _categoryId: number): Promise<void> {
		// TODO: check category validity from google api
	}


	test(url: string, channelId: string | undefined, categoryId: number | undefined): BlockTestRes {
		if (this.testList(ListType.Whitelist, url, channelId, categoryId)) {
			return BlockTestRes.Whitelisted
		}

		if (this.testList(ListType.Blacklist, url, channelId, categoryId)) {
			return BlockTestRes.Whitelisted
		}
		
		return BlockTestRes.Ignored
	}

	private testList(listType: ListType, url: string, channelId: string | undefined, 
		categoryId: number | undefined): boolean {
		return this.compiledUrlRules[listType].some((regExp) => regExp.test(url)) ||
			channelId ? this.data[listType].ytChannels.some(({ id }) => id === channelId) : false ||
			categoryId ? this.data[listType].ytCategories.some(({ id }) => id === categoryId) : false
	}
}