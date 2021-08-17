import { Typography } from "@material-ui/core"
import { FunctionComponent } from "preact"
/**
 * Shared header for all tabs
 */
const TabHeader: FunctionComponent = ({ children }) => (
	<Typography variant="h1" sx={{ mb: 2 }}>
		{children}
	</Typography>
)

export default TabHeader
