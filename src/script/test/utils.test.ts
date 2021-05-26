import { compress, decompress } from "../utils"

test('Save data compress and decompress', () => {
	const testObject = { test: { test: [{}, 42, "test"] } }
	const compressed = compress(testObject)

	expect(compressed.length).toBeGreaterThan(0)
	expect(/[A-Za-z0-9+/=]/.test(compressed)).toBe(true)
	expect(decompress(compressed)).toMatchObject(testObject)
});