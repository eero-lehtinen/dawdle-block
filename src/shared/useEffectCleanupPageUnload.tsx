import { EffectCallback, Inputs, useEffect } from "preact/hooks"

/* eslint-disable react-hooks/exhaustive-deps */
/** useEffect hook extended to call cleanup on page unload */
const useEffectCleanUpPageUnload = (
	effect: EffectCallback, inputs?: Inputs | undefined): ReturnType<typeof useEffect> => {
	inputs = inputs ?? []
	return useEffect(() => {
		const cleanup = effect()
		if (cleanup !== undefined) {
			window.addEventListener("beforeunload", cleanup)
			return () => {
				window.removeEventListener("beforeunload", cleanup)
				cleanup()
			}
		}
		return undefined
	}, [effect, ...inputs])
}
/* eslint-enable react-hooks/exhaustive-deps */

export default useEffectCleanUpPageUnload