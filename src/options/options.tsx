import { Box, Container } from "@material-ui/core"
import { NavDrawer } from "./navDrawer"
import { HashRouter, Switch, Route, Redirect } from "react-router-dom"
import { GeneralOptions } from "./generalOptions"
import { useBGScript } from "@src/shared/bgScriptProvider"
import { ImportExport } from "./importExport"
import { BlockSetOptions } from "./blockSetOptions"
import { LocalizationProvider } from "@material-ui/lab"
import AdapterDayjs from "@material-ui/lab/AdapterDayjs"

/**
 * Main function for rendering options menu.
 */
export const Options = (): JSX.Element => {
	const _bg = useBGScript()
	return (
		<LocalizationProvider dateAdapter={AdapterDayjs}>
			<Container maxWidth="lg" sx={{ display: "flex" }}>
				<HashRouter>
					<NavDrawer />
					<Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: "darkread" }}>
						<Switch>
							<Route exact path="/">
								<Redirect to="/general-options" />
							</Route>
							<Route path="/general-options">
								<GeneralOptions />
							</Route>
							<Route path="/import-export">
								<ImportExport />
							</Route>
							<Route path="/block-sets/:ordinal">
								<BlockSetOptions />
							</Route>
						</Switch>
					</Box>
				</HashRouter>
			</Container>
		</LocalizationProvider>
	)
}

