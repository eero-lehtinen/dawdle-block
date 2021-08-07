import { err } from "neverthrow"
import {
	ParseError,
	CantIdentifyVersionParseError,
	NullOrUndefinedParseError,
	parseableV0,
	parseableVN,
	ZodRes,
	neverThrowZodParse,
} from "./parserHelpers"
import {
	makeZGeneralOptionsDataV0,
	makeZGeneralOptionsDataV1,
	GeneralOptionsData,
	GeneralOptionsDataV0,
	GeneralOptionsDataV1,
} from "./generalOptionsParseTypes"

const zGeneralOptionsDataV0 = makeZGeneralOptionsDataV0()

const zGeneralOptionsDataV1 = makeZGeneralOptionsDataV1()

/** Converts plain js object into GeneralOptionsData with type validation. */
export const plainToGeneralOptionsData = (
	obj: unknown
): ZodRes<GeneralOptionsData, ParseError> => {
	if (obj === null || obj === undefined) return err(new NullOrUndefinedParseError())

	if (parseableV0(obj))
		return neverThrowZodParse(zGeneralOptionsDataV0.safeParse(obj)).map(convertV0toV1)
	else if (parseableVN(1, obj)) return neverThrowZodParse(zGeneralOptionsDataV1.safeParse(obj))

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
