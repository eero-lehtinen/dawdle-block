import { BlockSet } from "./blockSet"
import {
	ParseError,
	CantIdentifyVersionParseError,
	NullOrUndefinedParseError,
	neverThrowZodParse,
	ZodRes,
	ZodResDefault,
	parseableV0,
	parseableVN,
} from "./parserHelpers"
import { err } from "neverthrow"
import {
	BlockSetDataV1,
	BlockSetDataV0,
	BlockSetData,
	BlockSetIds,
	BlockSetTimesElapsed,
	makeZBlockSetIds,
	makeZBlockSetTimesElapsed,
	makeZBlockSetDataV0,
	makeZBlockSetDataV1,
	BlockListV0,
	BlockListV1,
} from "./blockSetParseTypes"

const zBlockSetIds = makeZBlockSetIds()

/** Converts plain js object into type BlockSetIds with type validation. */
export const plainToBlockSetIds = (obj: unknown): ZodResDefault<BlockSetIds> =>
	neverThrowZodParse(zBlockSetIds.safeParse(obj))

const zBlockSetTimesElapsed = makeZBlockSetTimesElapsed()

/** Converts plain js object into type BlockSetTimesElapsed with type validation. */
export const plainToBlockSetTimesElapsed = (
	obj: unknown
): ZodResDefault<BlockSetTimesElapsed> =>
	neverThrowZodParse(zBlockSetTimesElapsed.safeParse(obj))

const zBlockSetDataV0 = makeZBlockSetDataV0()
const zBlockSetDataV1 = makeZBlockSetDataV1()

/** Converts plain js object into a BlockSet with type validation. */
export const plainToBlockSetData = (obj: unknown): ZodRes<BlockSetData, ParseError> => {
	if (obj === null || obj === undefined) return err(new NullOrUndefinedParseError())

	if (parseableV0(obj))
		return neverThrowZodParse(zBlockSetDataV0.safeParse(obj)).map(convertV0toV1)

	if (parseableVN(1, obj)) return neverThrowZodParse(zBlockSetDataV1.safeParse(obj))

	return err(new CantIdentifyVersionParseError())
}

/** Creates a default object of type BlockSetData of the latest version. */
export const createDefaultBlockSetData = (): BlockSetData => zBlockSetDataV1.parse({ v: 1 })

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
			if (
				blockRule.type === "urlEquals" ||
				blockRule.type === "urlContains" ||
				blockRule.type === "urlPrefix" ||
				blockRule.type === "urlSuffix"
			) {
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
					newBlockList.ytChannels.push({
						id: blockRule.value.id,
						title: blockRule.value.name,
					})
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
