import { BlockSetData, BlockRuleYt, plainToBlockSetData, createDefaultBlockSet } from "./block-set-parsing"

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

		this.compileRules("whitelist")
		this.compileRules("blacklist")
	}

	private compileRules(rulesType: "whitelist" | "blacklist") {
		this.compiledUrlRules[rulesType] =
			this.data[rulesType].urlRegExps.map((value: string) => new RegExp(value))
				.concat(this.data[rulesType].urlPatterns.map((value: string) => this.urlPatternToRegExp(value)))
	}

	/**
	 * Replaces all non escaped wildcards into regular expression wildcards.
	 * Basically changes "*" to ".*".
	 * @param urlPattern url pattern with possible wildcards
	 * @returns regular expression object
	 */
	private urlPatternToRegExp(urlPattern: string): RegExp {
		let result = ""
		let backslash = false
		for (let i = 0; i < urlPattern.length; i++) {
			if (!backslash && urlPattern[i] === "*") {
				result += "."
			}
			else if (urlPattern[i] === "\\") {
				backslash = true
			}
			result += urlPattern[i]
		}

		return new RegExp(result)
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