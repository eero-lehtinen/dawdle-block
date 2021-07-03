import { FunctionComponent } from "preact"
import { CssBaseline, GlobalStyles } from "@material-ui/core"
import { ThemeProvider } from "@material-ui/core/styles"
import { createGlobalTheme } from "./globalTheme"
import { useBGScript } from "./bgScriptProvider"
import { BackgroundBox } from "./backgroundBox"
import { BGScriptProvider } from "../shared/bgScriptProvider"


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
 * Inner wrapper is used to get bg script context.
 */
const InnerWrapper: FunctionComponent = ({ children }) => {
	const bg = useBGScript()
	const mode = "dark"
	const theme = createGlobalTheme(mode)

	const scrollbarColors = {
		track: theme.palette.background.default, 
		thumb: "#121212",
	}

	return (
		<>
			<ThemeProvider theme={theme} >
				<CssBaseline /> 
				<GlobalStyles styles={{ 
					// Chromium
					"::-webkit-scrollbar": { color: "#FFF", width: "10px" }, 
					"::-webkit-scrollbar-track": { backgroundColor: scrollbarColors.track },
					"::-webkit-scrollbar-thumb:hover, ::-webkit-scrollbar-thumb": 
						{ backgroundColor: scrollbarColors.thumb, borderRadius: 10 },
					// Firefox
					"*": {
						"scrollbar-color": `${scrollbarColors.thumb} ${scrollbarColors.track}`,
						"scrollbar-width": "thin",
					},
				}} 
				/>
				<BackgroundBox>
					{ bg !== null && children }
				</BackgroundBox>
			</ThemeProvider>
		</>
	)
}