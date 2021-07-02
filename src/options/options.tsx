import { Button } from "@material-ui/core"
import { HomeRounded } from "@material-ui/icons"
import { ThemeProvider } from "@material-ui/core/styles"
import { globalTheme } from "../shared/globalTheme"

export const Options = 
	<ThemeProvider theme={globalTheme} >
		<HomeRounded/>
		<Button>Hello World</ Button>
	</ThemeProvider>