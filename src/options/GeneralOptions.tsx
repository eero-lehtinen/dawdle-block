import { Typography, Stack } from "@material-ui/core"
import ThemeInput from "./ThemeInput"
import TimeConventionInput from "./TimeConventionInput"

/**
 * General options page for options menu.
 */
const GeneralOptions = (): JSX.Element => {
	return (
		<>
			<Typography variant="h1" sx={{ mb: 2 }}>
				General Options
			</Typography>
			<Stack spacing={3}>
				<ThemeInput />
				<TimeConventionInput />
			</Stack>
		</>
	)
}

export default GeneralOptions
