import { Box, Container } from "@material-ui/core"
import { BaseWrapper } from "../shared/baseWrapper"
import { NavDrawer } from "./navDrawer"

/**
 * Main function for rendering options menu.
 */
export const Options = (): JSX.Element =>
	<BaseWrapper>
		<NavDrawer />
		<Box component="main" sx={{ flexGrow: 1, p: 3 }}>
			<Container maxWidth="lg">
			</Container>
		</Box>
	</BaseWrapper>

