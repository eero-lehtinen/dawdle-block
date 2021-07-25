import { FunctionComponent } from "preact"
import { useEffect, useMemo, useState } from "preact/hooks"
import { CssBaseline, GlobalStyles, useMediaQuery } from "@material-ui/core"
import { ThemeProvider, Theme as MatUITheme } from "@material-ui/core/styles"
import { createGlobalTheme } from "./globalTheme"
import { useBGScript } from "./bgScriptProvider"
import { BackgroundBox } from "./backgroundBox"
import { BGScriptProvider } from "../shared/bgScriptProvider"
import { Theme } from "@src/background/generalOptionsParser"




/**
 * Contains common shared wrappers for theming and state management with background script.
 */
export const BaseWrapper: FunctionComponent = ({ children }) =>
	<BGScriptProvider>
		<InnerWrapper>
			{ children }
		</InnerWrapper>
	</BGScriptProvider>

/**
 * Global styles object that has styling for scrollbars.
 */
const MyGlobalStyles = ({ matUITheme }: { matUITheme: MatUITheme }) => {
	const scrollbarColors = {
		track: matUITheme.palette.background.default, 
		thumb: "#121212",
	}
	return (
		<GlobalStyles styles={{ 
		// Chromium
			"::-webkit-scrollbar": { color: "#FFF", width: "16px" }, 
			"::-webkit-scrollbar-track": { backgroundColor: scrollbarColors.track },
			"::-webkit-scrollbar-thumb": {
				backgroundColor: scrollbarColors.thumb, 
				borderRadius: 8, 
				border: `4px solid ${scrollbarColors.track}`, 
			},
			// Firefox
			"*": {
				scrollbarColor: `${scrollbarColors.thumb} ${scrollbarColors.track}`,
				scrollbarWidth: "thin",
			},
		}} 
		/>
	)
}

/**
 * Inner wrapper is used to get bg script context.
 */
const InnerWrapper: FunctionComponent = ({ children }) => {
	const bg = useBGScript()
	const [theme, setTheme] = useState<Theme>(bg.generalOptions.data.theme)
	const prefersDark = useMediaQuery("(prefers-color-scheme: dark)")
	const mode = theme === "system" ? (prefersDark ? "dark" : "light") : theme
	const matUITheme = useMemo(() => createGlobalTheme(mode), [mode])

	useEffect(() => 
		bg.generalOptions.subscribeChanged("theme", ({ newValue }) => setTheme(newValue)), 
	[bg.generalOptions])

	return (
		<>
			<ThemeProvider theme={matUITheme} >
				<CssBaseline /> 
				<MyGlobalStyles matUITheme={matUITheme} />
				<BackgroundBox>
					{ children }
				</BackgroundBox>
			</ThemeProvider>
		</>
	)
}