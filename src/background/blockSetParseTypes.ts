import { z } from "zod"
import ms from "ms.macro"

/* eslint-disable jsdoc/require-jsdoc*/
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export const makeZBlockSetIds = () => z.array(z.number().int().nonnegative())
export type BlockSetIds = z.infer<ReturnType<typeof makeZBlockSetIds>>

export const makeZBlockSetTimesElapsed = () => z.array(z.number().int().optional())
export type BlockSetTimesElapsed = z.infer<ReturnType<typeof makeZBlockSetTimesElapsed>>

const makeZActiveTime = () =>
	z
		.object({
			from: z.number().int().default(0),
			to: z.number().int().default(0),
		})
		.default({})
export type ActiveTime = z.infer<ReturnType<typeof makeZActiveTime>>

const makeZBlockRuleYTV0 = () =>
	z.object({
		type: z.enum(["ytChannel", "ytCategory"]),
		value: z.object({
			name: z.string(),
			id: z.string(),
		}),
	})

const makeZActiveDays = () => z.array(z.boolean()).length(7).default(new Array(7).fill(true))
export type ActiveDays = z.infer<ReturnType<typeof makeZActiveDays>>

const makeZBlockRuleUrlV0 = () =>
	z.object({
		type: z.enum(["urlEquals", "urlContains", "urlPrefix", "urlSuffix", "urlRegexp"]),
		value: z.string(),
	})

const makeZBlockRuleV0 = () => z.union([makeZBlockRuleYTV0(), makeZBlockRuleUrlV0()])

const makeZBlockListV0 = () => z.array(makeZBlockRuleV0()).default([])

// Original blockset options data structure
export const makeZBlockSetDataV0 = () =>
	z.object({
		v: z.union([z.undefined(), z.literal(0)]).transform((): 0 => 0),
		name: z.string().default("Block Set 1"),
		requireActive: z.boolean().default(false),
		annoyMode: z.boolean().default(false),
		timeAllowed: z.number().int().default(ms("30m")),
		resetTime: z.number().int().default(0),
		lastReset: z.number().int().default(0),
		activeDays: makeZActiveDays(),
		activeTime: makeZActiveTime(),
		blacklist: makeZBlockListV0(),
		whitelist: makeZBlockListV0(),
	})

export type BlockListV0 = z.infer<ReturnType<typeof makeZBlockListV0>>

export type BlockSetDataV0 = z.infer<ReturnType<typeof makeZBlockSetDataV0>>

const makeZBlockRuleUrlV1 = () => z.string()

const makeZBlockRuleYTChannelV1 = () =>
	z.object({
		id: z.string(),
		title: z.string(),
	})

const makeZBlockRuleYTCategoryV1 = () => z.string()

const makeZBlockListV1 = () =>
	z
		.object({
			urlPatterns: z.array(makeZBlockRuleUrlV1()).default([]),
			urlRegExps: z.array(makeZBlockRuleUrlV1()).default([]),
			ytChannels: z.array(makeZBlockRuleYTChannelV1()).default([]),
			ytCategoryIds: z.array(makeZBlockRuleYTCategoryV1()).default([]),
		})
		.default({})
export type BlockListV1 = z.infer<ReturnType<typeof makeZBlockListV1>>

// Most recent blockset options data structure version with
// updated block rule structure. Extends block set version 0.
export const makeZBlockSetDataV1 = () =>
	makeZBlockSetDataV0().extend({
		v: z.literal(1),
		blacklist: makeZBlockListV1(),
		whitelist: makeZBlockListV1(),
	})
export type BlockSetDataV1 = z.infer<ReturnType<typeof makeZBlockSetDataV1>>

export type BlockList = BlockListV1
export type BlockSetData = BlockSetDataV1
