/**
 * @file Contains BlockSet class implementation.
 */

import { BlockSetData, BlockRuleYt, plainToBlockSetData, createDefaultBlockSet } from "./blockSetParser"
import { escapeToWildcardRegExp } from "./utils"

export enum BlockTestRes {
	Blacklisted,
	Whitelisted,
	Ignored,
}

export enum ListType {
	Blacklist,
	Whitelist,
}

interface CompiledRules {
	blacklist: RegExp[],
	whitelist:  RegExp[],
}

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
	private compileRules(rulesType?: "whitelist" | "blacklist"): void {
		if (!rulesType) {
			this.compileRules("whitelist")
			this.compileRules("blacklist")
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

	getUrlRules(rulesType: "whitelist" | "blacklist"): RegExp[] { 
		return this.compiledUrlRules[rulesType]
	}

	getYtChannelRules(rulesType: "whitelist" | "blacklist"): BlockRuleYt[] { 
		return this.data[rulesType].ytChannels
	}

	getYtCategoryRules(rulesType: "whitelist" | "blacklist"): BlockRuleYt[] { 
		return this.data[rulesType].ytCategories
	}
}