import { Box } from "@material-ui/core"
import { FunctionComponent } from "preact"

/**
 * Styled box for the background. Stretches to whole viewport.
 */
const BackgroundBox: FunctionComponent = ({ children }) => (
	<Box
		sx={{
			width: "100%",
			height: "100%",
			bgcolor: "background.default",
		}}
	>
		{children}
	</Box>
)

export default BackgroundBox
