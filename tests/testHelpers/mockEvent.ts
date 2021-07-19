/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */


const allListenersArrays: ((...args: any[]) => void)[][] = []

/** Clears all listeners from events made with `mockEvent`*/
export const clearMockEventListeners = () => {
	allListenersArrays.forEach(listeners => listeners.length = 0)
}

/**
 * Mock any browser.* event by supplying its listener parameters as type and the 
 * event itself as a parameter to this function.
 * All events made with this function can be cleared with the function `clearMockEventListeners`.
 * @returns function for artificially emitting this event
 */
export const mockEvent = <EventParams extends any[]>(event: {addListener: any}) => {
	const listeners: Array<(...args: EventParams) => void> = []
	allListenersArrays.push(listeners as any)

	event.addListener = 
		jest.fn((listener: (...args: EventParams) => void) => listeners.push(listener))

	return (...args: EventParams) => listeners.forEach(listener => listener(...args))
}