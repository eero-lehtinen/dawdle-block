/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Mock any browser.* event by supplying its listener parameters to this function.
 */
const mockEvent = <EventParams extends any[]>(event: {addListener: any}) => {
	const listeners: Array<(...args: EventParams) => void> = []

	event.addListener = 
		jest.fn((listener: (...args: EventParams) => void) => listeners.push(listener))

	return (...args: EventParams) => listeners.forEach(listener => listener(...args))
}

export default mockEvent