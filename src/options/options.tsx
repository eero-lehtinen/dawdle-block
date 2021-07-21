import { Box, Container } from "@material-ui/core"
import { NavDrawer } from "./navDrawer"
import { HashRouter, Switch, Route, Redirect } from "react-router-dom"


/**
 * Main function for rendering options menu.
 */
export const Options = (): JSX.Element => {
	return (
		<Container maxWidth="lg" sx={{ display: "flex" }}>
			<HashRouter>
				<NavDrawer />
				<Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: "darkread" }}>
					<Switch>
						<Route exact path="/">
							<Redirect to="/general-options" />
						</Route>
						<Route path="/general-options">
							GENERAL
						</Route>
						<Route path="/block-sets/:ordinal">
						BLOCKSETS
						</Route>
					</Switch>
				</Box>
			</HashRouter>
		</Container>
	)
}

