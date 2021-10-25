import { Box, Container } from "@mui/material"
import NavDrawer from "./NavDrawer"
import { HashRouter, Switch, Route, Redirect } from "react-router-dom"
import GeneralOptions from "./GeneralOptions"
import { useBGScript } from "@src/shared/BGScriptProvider"
import ImportExport from "./ImportExport"
import BlockSetOptions from "./BlockSetOptions"
import { LocalizationProvider } from "@mui/lab"
import AdapterDayjs from "@mui/lab/AdapterDayjs"
import SettingsLock from "./SettingsLock"

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
							<Route path="/settings-lock">
								<SettingsLock />
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
