import { compressSync, decompressSync, strToU8, strFromU8 } from "fflate"
import { fromUint8Array, toUint8Array } from "js-base64"

/**
 * compress js object and convert to base64 string for easy json storage
 * @param {unknown} object
 * @returns {string} base64 string
 */
export const compress = (object: unknown): string =>
	fromUint8Array(compressSync(strToU8(JSON.stringify(object))))

/**
 * decompress base64 encoded string and return the object it stores
 * @param {string} base64str 
 * @returns {unknown} object
 */
export const decompress = (base64str: string): unknown =>
	JSON.parse(strFromU8(decompressSync(toUint8Array(base64str))))

/**
 * Escape user defined strings to be used in regular expressions for exact matching.
 * Copied from MDN https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping.
 * @param string string to escape
 * @returns escaped string
 */
export const escapeRegExp = (string: string): string =>
	string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // $& means the whole matched string


