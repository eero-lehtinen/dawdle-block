
import { z } from "zod"

const zActiveTime = z.object({
	from: z.number().int().default(0),
	to: z.number().int().default(0)
})
type ActiveTime = z.infer<typeof zActiveTime>

const zBlockRuleYt = z.object({
	type: z.enum(["ytChannel", "ytCategory"]),
	value: z.object({
		name: z.string(),
		id: z.string()
	})
})

const zBlockRuleUrlV0 = z.object({
	type: z.enum(["urlEquals", "urlContains", "urlPrefix", "urlSuffix", "urlRegexp"]),
	value: z.string()
})

const zBlockRuleV0 = z.union([zBlockRuleYt, zBlockRuleUrlV0])
type BlockRuleV0 = z.infer<typeof zBlockRuleV0>

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
	blacklist: z.array(zBlockRuleV0).default([] as BlockRuleV0[]),
	whitelist: z.array(zBlockRuleV0).default([] as BlockRuleV0[])
})


const zBlockRuleUrlV1 = zBlockRuleUrlV0.extend({
	type: z.enum(["urlPattern", "urlRegexp"])
})

const zBlockRuleV1 = z.union([zBlockRuleYt, zBlockRuleUrlV1])
type BlockRuleV1 = z.infer<typeof zBlockRuleV1>

const zBlockSetV1 = zBlockSetV0.extend({
	v: z.literal(1).default(1),
	blacklist: z.array(zBlockRuleV1).default([] as BlockRuleV1[]),
	whitelist: z.array(zBlockRuleV1).default([] as BlockRuleV1[])
})

export type BlockSet = z.infer<typeof zBlockSetV1>

/**
 * Converts plain js object into a BlockSet with type validation
 * @param obj 
 * @returns 
 */
export const plainToBlockSet = 
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
(obj: any): BlockSet => {
	
	if (parseableV0(obj)) {
		const parsedBlockSet = zBlockSetV0.parse(obj)
		return zBlockSetV1.parse(convertV0toV1(parsedBlockSet))
	}
	else if (parseableV1(obj)) {
		return zBlockSetV1.parse(obj)
	}

	throw new Error("Can't parse to block set")
}

export const createDefaultBlockSet = () : BlockSet => {
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
		for (const blockRule of blockSet[list]) {
			switch (blockRule.type) {
			case "urlEquals":
				blockRule.type = "urlPattern"
				break
			case "urlContains":
				blockRule.type = "urlPattern"
				blockRule.value = `*${blockRule.value}*` 
				break
			case "urlPrefix":
				blockRule.type = "urlPattern"
				blockRule.value = `${blockRule.value}*` 
				break
			case "urlSuffix":
				blockRule.type = "urlPattern"
				blockRule.value = `*${blockRule.value}` 
				break
			}
		}
	}
	return blockSet
}