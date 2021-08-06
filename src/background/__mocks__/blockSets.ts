/** Mocked to only construct without any logic. */
export class BlockSets {
	/** Mock function to only construct empty Background. */
	static create(): Promise<BlockSets> {
		return Promise.resolve(new BlockSets())
	}
}
