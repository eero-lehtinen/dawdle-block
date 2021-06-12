
import { compress, decompress, escapeRegExp, escapeWildcardRegExp } from "../src/scripts/background/utils"

const testObject = { test: { test: [{}, 42, "test"] } }

// testObject compressed with old code
const testObjectCompressedOld = "H4sIADmFsWAAA6tWKkktLlGygtHR1bU6JkY6EF5sbS0AV4VECSAAAAA="

describe("test save compression and decompression", () => {
	it("compress output isn't empty and is in base 64", () => {
		const compressed = compress(testObject)
		expect(compressed.length).toBeGreaterThan(0)
		expect(/[A-Za-z0-9+/=]/.test(compressed)).toBe(true)
	})

	it("save data compress and decompress loses no data", () => {
		const compressed = compress(testObject)
		expect(decompress(compressed)).toStrictEqual(testObject)
	})

	it("saves compressed with old system decompress into the same value", () => {
		expect(decompress(testObjectCompressedOld)).toStrictEqual(testObject)
	})
})

describe("test regular expression escaping", () => {
	it("can escape a basic example", () => {
		expect(escapeRegExp("[.*+?^${}()|[]\\]asdfäxcopåvij❤"))
			.toStrictEqual(String.raw`\[\.\*\+\?\^\$\{\}\(\)\|\[\]\\\]asdfäxcopåvij❤`)
	})

	const expectRegExp = (regExpString: string, testString: string) =>
		expect(new RegExp("^" + escapeRegExp(regExpString) + "$").test(testString))

	it("weird backslash escaping works as intended", () => {
		expectRegExp(String.raw`\a\\b\\\c`, String.raw`\a\\b\\\c`).toBeTruthy()

		expectRegExp(String.raw`\c`, String.raw`c`).toBeFalsy()
		expectRegExp(String.raw`\c`, String.raw`\\c`).toBeFalsy()
		expectRegExp(String.raw`\c`, String.raw`\\\c`).toBeFalsy()
	})

	describe("test wildcarded pattern escaping", () => {
		it("can escape a basic example", () => {
			expect(escapeWildcardRegExp("[.*\\*+?^${}()|[]\\]asdfäxcopåvij❤"))
				.toStrictEqual(String.raw`\[\..*\*\+\?\^\$\{\}\(\)\|\[\]\\\]asdfäxcopåvij❤`)
		})

		it("replaces wildcards(*) with regexp wildcards(.*)", () => {
			expect(escapeWildcardRegExp("a*b*")).toStrictEqual("a.*b.*")
		})

		it("does not replace already escaped wildcards(*)", () => {
			expect(escapeWildcardRegExp(String.raw`a\*b\*`)).toStrictEqual(String.raw`a\*b\*`)
		})
	})
})