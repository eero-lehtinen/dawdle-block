import { compress, decompress } from "../background/utils"

const testObject = { test: { test: [{}, 42, "test"] } }

// testObject compressed with old code
const testObjectCompressedOld = "H4sIADmFsWAAA6tWKkktLlGygtHR1bU6JkY6EF5sbS0AV4VECSAAAAA="

test("Compress output isn't empty and is in base 64", () => {
	const compressed = compress(testObject)
	expect(compressed.length).toBeGreaterThan(0)
	expect(/[A-Za-z0-9+/=]/.test(compressed)).toBe(true)
})

test("Save data compress and decompress loses no data", () => {
	const compressed = compress(testObject)
	expect(decompress(compressed)).toStrictEqual(testObject)
})

test("Old saves decompress correctly", () => {
	expect(decompress(testObjectCompressedOld)).toStrictEqual(testObject)
})