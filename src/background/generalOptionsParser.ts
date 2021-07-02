import { z } from "zod"


const zClockType = z.union([z.literal(12), z.literal(24)]).default(24)
const zSettingsProtection = z.enum(["never", "always", "timerZero"]).default("never")

const zGeneralOptionsDataV0 = z.object({
	v: z.union([z.undefined(), z.literal(0)]).transform((): 0 => 0),
	clockType: zClockType,
	displayHelp: z.boolean().default(true),
	darkTheme: z.boolean().default(false),
	settingProtection: zSettingsProtection,
	typingTestWordCount: z.number().int().default(30),
})

type GeneralOptionsDataV0 = z.infer<typeof zGeneralOptionsDataV0>

const zTheme = z.enum(["system", "dark", "light"]).default("system")

const zGeneralOptionsDataV1 = zGeneralOptionsDataV0
	.omit({ darkTheme: true })
	.extend({
		v: z.literal(1),
		theme: zTheme,
	})

type GeneralOptionsDataV1 = z.infer<typeof zGeneralOptionsDataV1>

export type GeneralOptionsData = GeneralOptionsDataV1

/**
 * Converts plain js object into GeneralOptionsData with type validation.
 * @throws {Error} if object is not parseable
 * @param obj
 * @returns 
 */
export const plainToGeneralOptionsData = 
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
(obj: any): GeneralOptionsData => {
	if (obj !== null && obj !== undefined) {
		if (parseableV0(obj)) {
			const parsedGeneralOptionsV0 = zGeneralOptionsDataV0.parse(obj)
			return convertV0toV1(parsedGeneralOptionsV0)
		}
		else if (parseableV1(obj)) {
			return zGeneralOptionsDataV1.parse(obj)
		}
	}
	throw new Error("Can't parse to general options")
}

/**
 * Creates a default object of type GeneralOptionsData of the latest version.
 * @returns default GeneralOptionsData
 */
export const createDefaultGeneralOptionsData = (): GeneralOptionsData => {
	return zGeneralOptionsDataV1.parse({ v: 1 })
}

/**
 * Converts block set version 0 to version 1.
 * In practice we replace some block rules to the new pattern style.
 * @param generalOptions 
 * @returns 
 */
const convertV0toV1 = (generalOptionsV0: GeneralOptionsDataV0) => {

	const { darkTheme, ...sharedParams } = generalOptionsV0

	const generalOptionsV1: GeneralOptionsDataV1 = {
		...sharedParams, 
		v: 1,
		theme: darkTheme ? "dark" : "system", 
	}

	return generalOptionsV1
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Checks if passed object should be parsed with v0 block set parser
 * @param obj 
 * @returns 
 */
const parseableV0 = (obj: any) => {
	return typeof obj === "object" && (!("v" in obj) || obj.v < 1)
}

/**
 * Checks if passed object should be parsed with v1 block set parser
 * @param obj 
 * @returns 
 */
const parseableV1 = (obj: any) => {
	return typeof obj === "object" && "v" in obj && obj.v === 1
}