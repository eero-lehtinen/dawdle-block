import { compress, decompress } from "@src/background/compression"
import { err } from "neverthrow"

const testObject = { test: { test: [{}, 42, "test"] } }

// testObject compressed with old code
const testObjectCompressedOld = "H4sIADmFsWAAA6tWKkktLlGygtHR1bU6JkY6EF5sbS0AV4VECSAAAAA="

describe("test save compression and decompression", () => {
	test("compress output isn't empty and is in base 64", () => {
		const compressed = compress(testObject)
		expect(compressed.length).toBeGreaterThan(0)
		expect(/[A-Za-z0-9+/=]/.test(compressed)).toBe(true)
	})

	test("save data compress and decompress loses no data", () => {
		const compressed = compress(testObject)
		expect(decompress(compressed)._unsafeUnwrap()).toStrictEqual(testObject)
	})

	test("saves compressed with old system decompress into the same value", () => {
		expect(decompress(testObjectCompressedOld)._unsafeUnwrap()).toStrictEqual(testObject)
	})

	test("returns error when compressed value is invalid (not gzip compressed base64 string)", () => {
		expect(decompress("x")).toStrictEqual(err("InputCantBeDecompressed"))
	})
})
