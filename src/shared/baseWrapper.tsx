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

	return (
		<>
			<ThemeProvider theme={createGlobalTheme("dark")} >
				<CssBaseline /> 
				<GlobalStyles styles={{ 
					"::-webkit-scrollbar-track": { backgroundColor: "white" },
					"::-webkit-scrollbar-thumb:hover, ::-webkit-scrollbar-thumb": 
						{ backgroundColor: "black" },
				}} 
				/>
				<BackgroundBox>
					{ bg !== null && children }
				</BackgroundBox>
			</ThemeProvider>
		</>
	)
}