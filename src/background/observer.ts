export type Listener<Ev> = (ev: Ev) => void

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ListenerOf<O extends Observer<any>> = O extends Observer<infer Ev>
	? Listener<Ev>
	: never

/**
 * Class used for publishing events to listeners.
 */
export class Observer<Ev> {
	private listeners: Listener<Ev>[] = []

	/**
	 * Subscribes listener to receive events in the future.
	 * @param listener function for receiving events
	 * @returns unsubscribe function
	 */
	subscribe(listener: Listener<Ev>): () => void {
		this.listeners.push(listener)
		return () => {
			this.listeners = this.listeners.filter(l => l !== listener)
		}
	}

	/**
	 * Publishes event to all listeners
	 * @param event
	 */
	publish(event: Ev): void {
		this.listeners.forEach(listener => listener(event))
	}
}

export type ChangedEvent<T> = {
	newValue: T
}
