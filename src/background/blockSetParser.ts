import { z } from "zod"
import { BlockSet } from "./blockSet"
import ms from "ms.macro"
import { neverThrowZodParse, ParseError, ZodRes, ZodResDefault } from "./parserHelpers"
import { err } from "neverthrow"

const zBlockSetIds = z.array(z.number().int().nonnegative())
export type BlockSetIds = z.infer<typeof zBlockSetIds>

/** Converts plain js object into type BlockSetIds with type validation. */
export const plainToBlockSetIds =	(obj: unknown): ZodResDefault<BlockSetIds> => 
	neverThrowZodParse(zBlockSetIds.safeParse(obj))

const zBlockSetTimesElapsed = z.array(z.number().int().optional())
export type BlockSetTimesElapsed = z.infer<typeof zBlockSetTimesElapsed>

/** Converts plain js object into type BlockSetTimesElapsed with type validation. */
export const plainToBlockSetTimesElapsed = (obj: unknown): ZodResDefault<BlockSetTimesElapsed> => 
	neverThrowZodParse(zBlockSetTimesElapsed.safeParse(obj))

const zActiveTime = z.object({
	from: z.number().int().default(0),
	to: z.number().int().default(0),
}).default({})

export type ActiveTime = z.infer<typeof zActiveTime>

const zBlockRuleYTV0 = z.object({
	type: z.enum(["ytChannel", "ytCategory"]),
	value: z.object({
		name: z.string(),
		id: z.string(),
	}),
})

const zActiveDays = z.array(z.boolean()).length(7).default(new Array(7).fill(false))

export type ActiveDays = z.infer<typeof zActiveDays>

const zBlockRuleUrlV0 = z.object({
	type: z.enum(["urlEquals", "urlContains", "urlPrefix", "urlSuffix", "urlRegexp"]),
	value: z.string(),
})

const zBlockRuleV0 = z.union([zBlockRuleYTV0, zBlockRuleUrlV0])

const zBlockListV0 = z.array(zBlockRuleV0).default([])

// Original blockset options data structure
const zBlockSetDataV0 = z.object({
	v: z.union([z.undefined(), z.literal(0)]).transform((): 0 => 0),
	name: z.string().default("Block Set 1"),
	requireActive: z.boolean().default(false),
	annoyMode: z.boolean().default(false),
	timeAllowed: z.number().int().default(ms`30m`),
	resetTime: z.number().int().default(0),
	lastReset: z.number().int().default(0),
	activeDays: z.array(z.boolean()).length(7).default(new Array(7).fill(true)),
	activeTime: zActiveTime,
	blacklist: zBlockListV0,
	whitelist: zBlockListV0,
})

type BlockListV0 = z.infer<typeof zBlockListV0>

type BlockSetDataV0 = z.infer<typeof zBlockSetDataV0>

const zBlockRuleUrlV1 = z.string()

const zBlockRuleYTChannelV1 = z.object({
	id: z.string(),
	title: z.string(),
})

const zBlockRuleYTCategoryV1 = z.string()

const zBlockListV1 = z.object({
	urlPatterns: z.array(zBlockRuleUrlV1).default([]),
	urlRegExps: z.array(zBlockRuleUrlV1).default([]),
	ytChannels: z.array(zBlockRuleYTChannelV1).default([]),
	ytCategoryIds: z.array(zBlockRuleYTCategoryV1).default([]),
}).default({})

type BlockListV1 = z.infer<typeof zBlockListV1>

export type BlockList = BlockListV1

// Most recent blockset options data structure version with 
// updated block rule structure. Extends block set version 0.
const zBlockSetDataV1 = zBlockSetDataV0.extend({
	v: z.literal(1),
	blacklist: zBlockListV1,
	whitelist: zBlockListV1,
})

type BlockSetDataV1 = z.infer<typeof zBlockSetDataV1>

export type BlockSetData = BlockSetDataV1

/** Converts plain js object into a BlockSet with type validation. */
export const plainToBlockSetData = (obj: unknown): ZodRes<BlockSetData, ParseError> => {
	if (obj === null || obj === undefined)
		return err(ParseError.NullOrUndefined)

	if (parseableV0(obj))
		return neverThrowZodParse(zBlockSetDataV0.safeParse(obj)).map(convertV0toV1)
	
	if (parseableV1(obj))
		return neverThrowZodParse(zBlockSetDataV1.safeParse(obj))
	
	return err(ParseError.CantIdentifyVersion)
}

/** Creates a default object of type BlockSetData of the latest version. */
export const createDefaultBlockSetData = (): BlockSetData => 
	zBlockSetDataV1.parse({ v: 1 })

/**
 * Converts block set version 0 to version 1.
 * In practice we replace some block rules to the new pattern style.
 * @param blockSet 
 * @returns 
 */
const convertV0toV1 = (blockSet: BlockSetDataV0): BlockSetDataV1 => {

	const convertList = (blockList: BlockListV0): BlockListV1 => {
		const newBlockList: BlockListV1 = {
			urlPatterns: [],
			urlRegExps: [],
			ytChannels: [],
			ytCategoryIds: [],
		}

		for (const blockRule of blockList) {
			// Escape *-characters, because they are used as wildcards in v1
			if (blockRule.type === "urlEquals" || blockRule.type === "urlContains" ||
				blockRule.type === "urlPrefix" || blockRule.type === "urlSuffix") {
				blockRule.value = BlockSet.urlToPattern(blockRule.value)
			}
			
			// Switch from old block list structure to new.
			// Also switch from "urlEquals", "urlContains", etc. to simpler wildcard system.
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
				newBlockList.ytChannels.push({ id: blockRule.value.id, title: blockRule.value.name })
				break
			case "ytCategory":
				newBlockList.ytCategoryIds.push(blockRule.value.id)
				break
			}
		}
		return newBlockList
	}

	const { whitelist, blacklist, ...sharedParams } = blockSet
	return {
		...sharedParams,
		v: 1,
		whitelist: convertList(whitelist),
		blacklist: convertList(blacklist),
	}
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Checks if passed object should be parsed with v0 block set parser
 * @param obj 
 * @returns 
 */
const parseableV0 = (obj: any) => typeof obj === "object" && (!("v" in obj) || obj.v < 1)

/**
 * Checks if passed object should be parsed with v1 block set parser
 * @param obj 
 * @returns 
 */
const parseableV1 = (obj: any) => typeof obj === "object" && "v" in obj && obj.v === 1