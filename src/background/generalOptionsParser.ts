import { err } from "neverthrow"
import { z } from "zod"
import {
	ParseError,
	CantIdentifyVersionParseError,
	NullOrUndefinedParseError,
	parseableV0,
	parseableVN,
	ZodRes,
	neverThrowZodParse,
} from "./parserHelpers"

const zClockType = z.union([z.literal(12), z.literal(24)]).default(24)
export type ClockType = z.infer<typeof zClockType>

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

export type Theme = z.infer<typeof zTheme>

const zGeneralOptionsDataV1 = zGeneralOptionsDataV0.omit({ darkTheme: true }).extend({
	v: z.literal(1),
	theme: zTheme,
})

type GeneralOptionsDataV1 = z.infer<typeof zGeneralOptionsDataV1>

export type GeneralOptionsData = GeneralOptionsDataV1

/** Converts plain js object into GeneralOptionsData with type validation. */
export const plainToGeneralOptionsData =
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
	(obj: unknown): ZodRes<GeneralOptionsData, ParseError> => {
		if (obj === null || obj === undefined) return err(new NullOrUndefinedParseError())

		if (parseableV0(obj))
			return neverThrowZodParse(zGeneralOptionsDataV0.safeParse(obj)).map(convertV0toV1)
		else if (parseableVN(1, obj))
			return neverThrowZodParse(zGeneralOptionsDataV1.safeParse(obj))

		return err(new CantIdentifyVersionParseError())
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
