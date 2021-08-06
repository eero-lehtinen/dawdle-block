/** Mocked to only construct without any logic. */
export class GeneralOptions {
	/** Mock function to only construct empty Background. */
	static create(): Promise<GeneralOptions> {
		return Promise.resolve(new GeneralOptions())
	}
}
