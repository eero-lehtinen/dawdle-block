import { compressSync, decompressSync, strToU8, strFromU8 } from "fflate"
import { fromUint8Array, toUint8Array } from "js-base64"
import { Result } from "neverthrow"

/**
 * compress js object and convert to base64 string for easy json storage
 * @param {unknown} object
 * @returns {string} base64 string
 */
export const compress = (object: unknown): string =>
	fromUint8Array(compressSync(strToU8(JSON.stringify(object))))

export type DecompressError = "InputCantBeDecompressed"

const safeDecompress = Result.fromThrowable(
	str => JSON.parse(strFromU8(decompressSync(toUint8Array(str)))),
	(): DecompressError => "InputCantBeDecompressed"
)

/** Decompress base64 encoded string and return the object it stores. */
export const decompress = (base64str: string): Result<unknown, DecompressError> => {
	return safeDecompress(base64str)
}
