import { createContext } from "preact"
import { useEffect, useState, useContext } from "preact/hooks"
import { Background } from"../background/background"
import { FunctionComponent  } from "preact"
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
				if (page.background !== undefined) {
					setBGScript(page.background)
				}
				else {
					console.error("Undefined background, trying again...")
					await sleep(retryIntervalMS)
					setRetries(retries + 1)
				}
			}
			catch(err) {
				console.error(err.message)
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

