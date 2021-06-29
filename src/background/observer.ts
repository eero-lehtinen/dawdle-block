export type Listener<EventType> = (ev: EventType) => void

/**
 * Class used for publishing events to listeners.
 */
export class Observer<EventType> {
	private listeners: Listener<EventType>[] = []

	/**
	 * Subscribes listener to receive events in the future.
	 * @param listener function for receiving events
	 * @returns unsubscribe function
	 */
	subscribe(listener: Listener<EventType>): () => void {
		this.listeners.push(listener)
		return () => {
			this.listeners = this.listeners.filter(l => l !== listener)
		}
	}

	/**
	 * Publishes event to all listeners
	 * @param event 
	 */
	publish(event: EventType): void {
		this.listeners.forEach(listener => listener(event))
	}
}