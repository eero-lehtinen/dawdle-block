/**
 * @file Contains types for representing general options save data. 
 * Has parsing functions for converting a plain js object to it.
 */

import { z } from "zod"


const zClockType = z.union([z.literal(12), z.literal(24)]).default(24)
const zSettingsProtection = z.union([z.literal("never"), z.literal("always"), z.literal("timerZero")]).default("never")

const zGeneralOptionsV1 = z.object({
	v: z.union([z.undefined(), z.literal(1)]).transform(() => 1),
	clockType: zClockType,
	displayHelp: z.boolean().default(true),
	darkTheme: z.boolean().default(false),
	settingProtection: zSettingsProtection,
	typingTestWordCount: z.number().int().default(30),
}).default({})

export type GeneralOptions = z.infer<typeof zGeneralOptionsV1>

export const plainToGeneralOptions = 
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
(obj: any): GeneralOptions => {
	return zGeneralOptionsV1.parse(obj)
}

export const createDefaultGeneralOptions = () : GeneralOptions => {
	return zGeneralOptionsV1.parse({ v: 1 })
}