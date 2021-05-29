import {compressSync, decompressSync, strToU8, strFromU8} from "fflate"
import {fromUint8Array, toUint8Array} from "js-base64"

/**
 * compress js object and convert to base64 string for easy json storage
 * @param {unknown} object
 * @returns {string} base64 string
 */
export const compress = (object: unknown): string => {
	return fromUint8Array(compressSync(strToU8(JSON.stringify(object))))
}

/**
 * decompress base64 encoded string and return the object it stores
 * @param {string} base64str 
 * @returns {unknown} object
 */
export const decompress = (base64str: string): unknown => {
	return JSON.parse(strFromU8(decompressSync(toUint8Array(base64str))))
}

