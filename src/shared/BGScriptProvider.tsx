import { createContext, FunctionComponent } from "preact"
import { useEffect, useState, useContext } from "preact/hooks"
import { Background } from "../background/background"
import { browser } from "webextension-polyfill-ts"
import { sleep } from "./utils"
import { Box, Typography, CircularProgress, Fade } from "@mui/material"
import ms from "ms.macro"

const retryIntervalMS = ms("2s")

const BGScriptContext = createContext<Background | null>(null)

/**
 * Shows text in the middle of the screen indicating that background has not loaded all options yet.
 */
const WaitBox = () => (
	<Fade appear in timeout={5000}>
		<Box
			sx={{
				width: "100%",
				height: "100%",
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			<Typography variant="h4" sx={{ color: "white", mr: 2 }}>
				Waiting for background to finish loading
			</Typography>
			<CircularProgress sx={{ color: "white" }} />
		</Box>
	</Fade>
)

/** Provides context for useBGScript hook. */
const BGScriptProvider: FunctionComponent = ({ children }): JSX.Element => {
	const [bgScript, setBGScript] = useState<Background | null>(null)
	const [retries, setRetries] = useState(0)

	useEffect(() => {
		void (async () => {
			try {
				const page = await browser.runtime.getBackgroundPage()
				if (page.background === undefined) {
					throw new Error("Undefined background")
				}
				setBGScript(page.background)
			} catch (err) {
				console.error(err.message, `retrying in ${retryIntervalMS / 1000} seconds...`)
				await sleep(retryIntervalMS)
				setRetries(retries + 1)
			}
		})()
	}, [retries])

	return (
		<BGScriptContext.Provider value={bgScript}>
			{bgScript === null ? <WaitBox /> : children}
		</BGScriptContext.Provider>
	)
}

/**
 * Custom hook for getting bg script context.
 * @throws Error if background is null. Should never happen,
 * because BGScriptProvider doesn't render its children when background is null.
 */
export const useBGScript = (): Background => {
	const background = useContext(BGScriptContext)
	if (background === null) {
		throw Error("Children are being rendered before background is defined")
	}
	return background
}

export default BGScriptProvider
