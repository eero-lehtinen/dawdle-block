/** Mocked to only construct without any logic. */
export class TabObserver {
	/** Mock function to only construct empty Background. */
	static create(): Promise<TabObserver> {
		return Promise.resolve(new TabObserver())
	}
}
