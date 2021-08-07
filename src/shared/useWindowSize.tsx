import { useState, useEffect } from "preact/hooks"
import { debounce } from "./utils"
import ms from "ms.macro"

const debounceWait = ms("200ms")

/**
 * Returns dimensions of the current window.
 * Updates when user zooms or otherwise resizes the window.
 * Has debounce timer to not update every frame.
 */
const useWindowSize = (): { height: number; width: number } => {
	const [dimensions, setDimensions] = useState({
		height: window.innerHeight,
		width: window.innerWidth,
	})
	useEffect(() => {
		const handleResize = debounce(() => {
			setDimensions({
				height: window.innerHeight,
				width: window.innerWidth,
			})
		}, debounceWait)

		window.addEventListener("resize", () => void handleResize())

		return () => window.removeEventListener("resize", () => void handleResize())
	}, [])

	return dimensions
}

export default useWindowSize
