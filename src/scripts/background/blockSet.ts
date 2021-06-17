/**
 * @file Contains BlockSet class implementation.
 */

import { BlockSetData, BlockRuleYt, plainToBlockSetData, createDefaultBlockSet } from "./blockSetParser"
import { escapeToWildcardRegExp } from "./utils"

export enum ListType {
	Blacklist = "blacklist",
	Whitelist = "whitelist",
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

	getUrlRules(rulesType: ListType): RegExp[] { 
		return this.compiledUrlRules[rulesType]
	}

	getYTChannelRules(rulesType: ListType): BlockRuleYt[] { 
		return this.data[rulesType].ytChannels
	}

	getYTCategoryRules(rulesType: ListType): BlockRuleYt[] { 
		return this.data[rulesType].ytCategories
	}
}