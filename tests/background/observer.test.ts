import { Observer, Listener } from "@src/background/observer"

describe("test observer", () => {
	test("can subscribe, receive events and unsubscribe", () => {
		const observer = new Observer<number>()
		
		const listener: Listener<number> = jest.fn()
		const unsubscribe = observer.subscribe(listener)

		observer.publish(42)
		expect(listener).toBeCalledWith(42)
		expect(listener).toBeCalledTimes(1)

		unsubscribe()

		observer.publish(24)
		expect(listener).toBeCalledTimes(1)
	})
})