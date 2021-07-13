/** Main class for whole background. Mocked to only construct without any logic. */
export class Background {
	/** Mock function to only construct empty Background. */
	static async create(): Promise<Background> {
		return Promise.resolve(new Background())
	}
}