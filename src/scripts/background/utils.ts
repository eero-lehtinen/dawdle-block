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
 * Escape user defined strings to be used in regular expressions for exact matching with wildcards.
 * Part of regular expression copied from MDN 
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping.
 * @param string string to escape
 * @returns escaped string
 */
export const escapeWildcardRegExp = (string: string): string =>
	string.replace(/(\\\*)|(\*)|([.+?^${}()|[\]\\])/g, 
		(_, p1, p2, p3): string => {
			// If we found an escaped wildcard, just return it
			if (p1)
				return p1

			// If we found an unescaped wildcard, replace it with a regular expression wildcard
			if (p2)
				return ".*"
			
			// Otherwise just escape the forbidden character
			return `\\${p3}`
		})

/**
 * Escape characters reserved for patterns. Currently only *.
 * @param string string to escape
 * @returns escaped string safe to use as pattern
 */
export const escapePattern = (string: string): string =>
	string.replace(/\*/g, String.raw`\*`)




