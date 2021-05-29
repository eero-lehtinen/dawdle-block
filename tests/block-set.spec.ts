import { BlockSet, plainToBlockSet } from "../src/scripts/block-set"

test("Empty js object becomes default BlockSet object", () => {
	expect(plainToBlockSet({})).toStrictEqual(new BlockSet())
})