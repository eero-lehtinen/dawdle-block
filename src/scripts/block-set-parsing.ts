
import { z } from "zod"

const zBlocksetIds = z.array(z.number().int().positive())
export type BlockSetIds = z.infer<typeof zBlocksetIds>

const zBlocksetTimesElapsed = z.array(z.number().int().positive())
export type BlocksetTimesElapsed = z.infer<typeof zBlocksetTimesElapsed>

const zActiveTime = z.object({
	from: z.number().int().default(0),
	to: z.number().int().default(0),
})
type ActiveTime = z.infer<typeof zActiveTime>

const zBlockRuleYtV0 = z.object({
	type: z.enum(["ytChannel", "ytCategory"]),
	value: z.object({
		name: z.string(),
		id: z.string(),
	}),
})

const zBlockRuleUrlV0 = z.object({
	type: z.enum(["urlEquals", "urlContains", "urlPrefix", "urlSuffix", "urlRegexp"]),
	value: z.string(),
})

const zBlockRuleV0 = z.union([zBlockRuleYtV0, zBlockRuleUrlV0])

// Original blockset options data structure
const zBlockSetV0 = z.object({
	v: z.undefined().optional(),
	name: z.string().default("Block Set 1"),
	requireActive: z.boolean().default(false),
	annoyMode: z.boolean().default(false),
	timeAllowed: z.number().int().default(60_000),
	resetTime: z.number().int().default(0),
	lastReset: z.number().int().default(0),
	activeDays: z.array(z.boolean()).length(7).default(new Array(7).fill(false)),
	activeTime: zActiveTime.default({ from: 0, to: 0 } as ActiveTime),
	blacklist: z.array(zBlockRuleV0).default([]),
	whitelist: z.array(zBlockRuleV0).default([]),
})


const zBlockRuleUrlV1 = z.string()

const zBlockRuleYtV1 = z.object({
	id: z.string(),
	name: z.string(),
})

export type BlockRuleYt = z.infer<typeof zBlockRuleYtV1>

const zBlockListV1 = z.object({
	urlPatterns: z.array(zBlockRuleUrlV1).default([]),
	urlRegExps: z.array(zBlockRuleUrlV1).default([]),
	ytChannels: z.array(zBlockRuleYtV1).default([]),
	ytCategories: z.array(zBlockRuleYtV1).default([]),
}).default({})

// Most recent blockset options data structure version with 
// updated block rule structure. Extends block set version 0.
const zBlockSetV1 = zBlockSetV0.extend({
	v: z.literal(1).default(1),
	blacklist: zBlockListV1,
	whitelist: zBlockListV1,
})

export type BlockSetData = z.infer<typeof zBlockSetV1>

/**
 * Converts plain js object into a BlockSet with type validation
 * @throws {Error} if object is not parseable
 * @param obj 
 * @returns 
 */
export const plainToBlockSetData = 
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
(obj: any): BlockSetData => {
	
	if (parseableV0(obj)) {
		const parsedBlockSet = zBlockSetV0.parse(obj)
		return zBlockSetV1.parse(convertV0toV1(parsedBlockSet))
	}
	else if (parseableV1(obj)) {
		return zBlockSetV1.parse(obj)
	}

	throw new Error("Can't parse to block set")
}

export const createDefaultBlockSet = () : BlockSetData => {
	return zBlockSetV1.parse({})
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Checks if passed object should be parsed with v0 block set parser
 * @param obj 
 * @returns 
 */
const parseableV0 = (obj: any) => {
	return !!obj && typeof obj === "object" && (!("v" in obj) || obj.v < 1)
}

/**
 * Checks if passed object should be parsed with v1 block set parser
 * @param obj 
 * @returns 
 */
const parseableV1 = (obj: any) => {
	return !!obj && typeof obj === "object" && "v" in obj && obj.v === 1
}

/**
 * Converts block set version 0 to version 1.
 * In practice we replace some block rules to the new pattern style.
 * @param blockSet 
 * @returns 
 */
const convertV0toV1 = (blockSet: any) => {
	for (const list of ["blacklist", "whitelist"]) {
		const newBlockList = zBlockListV1.parse({})

		for (const blockRule of blockSet[list]) {
			switch (blockRule.type) {
			case "urlEquals":
				newBlockList.urlPatterns.push(blockRule.value)
				break
			case "urlContains":
				newBlockList.urlPatterns.push(`*${blockRule.value}*`)
				break
			case "urlPrefix":
				newBlockList.urlPatterns.push(`${blockRule.value}*`)
				break
			case "urlSuffix":
				newBlockList.urlPatterns.push(`*${blockRule.value}`)
				break
			case "urlRegexp":
				newBlockList.urlRegExps.push(blockRule.value)
				break
			case "ytChannel":
				newBlockList.ytChannels.push(blockRule.value)
				break
			case "ytCategory":
				newBlockList.ytCategories.push(blockRule.value)
				break
			}
		}

		blockSet[list] = newBlockList
	}
	return blockSet
}