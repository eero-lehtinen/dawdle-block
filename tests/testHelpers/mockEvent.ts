/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */


const allListenersArrays: ((...args: any[]) => void)[][] = []

/** Clears all listeners from events made with `mockEvent`*/
export const clearMockEventListeners = () => {
	allListenersArrays.forEach(listeners => listeners.length = 0)
}

/**
 * Mock any browser.* event with addListener function.
 * All events made with this function can be cleared with the function `clearMockEventListeners`.
 * @returns function for artificially emitting this event
 */
export const mockEvent = <T extends (...args: any[]) => void>(event: {addListener: T}) => {
	type Params = Parameters<Parameters<T>[0]>
	const listeners: Array<(...args: Params) => void> = []
	allListenersArrays.push(listeners as any)

	event.addListener = 
		jest.fn((listener: (...args: Params) => void) => listeners.push(listener)) as any

	return (...args: Params) => listeners.forEach(listener => listener(...args))
}