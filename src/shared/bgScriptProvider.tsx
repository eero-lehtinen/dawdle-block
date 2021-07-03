import { createContext, FunctionComponent } from "preact"
import { useEffect, useState, useContext } from "preact/hooks"
import { Background } from"../background/background"
import { browser } from "webextension-polyfill-ts"
import { sleep } from "./utils"

const retryIntervalMS = 2000

const BGScriptContext = createContext<Background | null>(null)

/**
 * Provides context for useBGScript hook.
 */
export const BGScriptProvider: FunctionComponent = ({ children }): JSX.Element => {
	const [bgScript, setBGScript] = useState<Background | null>(null)
	const [retries, setRetries] = useState(0)

	useEffect(() => {
		void (async() => {
			try {
				const page = await browser.runtime.getBackgroundPage()
				if (page.background === undefined) {
					throw new Error("Undefined background")
				}
				setBGScript(page.background)
			}
			catch(err) {
				console.error(err.message, `retrying in ${retryIntervalMS / 1000} seconds...`)
				await sleep(retryIntervalMS)
				setRetries(retries + 1)
			}
		})()
	}, [retries])

	return (
		<BGScriptContext.Provider value={bgScript}>
			{ children }
		</BGScriptContext.Provider>
	)
}

/**
 * Custom hook for getting bg script context.
 * Result can be null after launching for a very short time.
 * After that it will always be available.
 */
export const useBGScript = (): Background | null => useContext(BGScriptContext)

