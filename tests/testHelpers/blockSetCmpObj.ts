import { BlockSet } from "@src/background/blockSet"

/**
 * Creates jest expect object to allow deep comparison of two block set objects.
 * @example
 * expect(blockSet).toEqual(blockSetCmpObj(otherBlockSet))
 */
const blockSetCmpObj = (blockSet: BlockSet): jest.Expect => {
	return expect.objectContaining({ ...blockSet, changeObservers: expect.anything() })
}

export default blockSetCmpObj
