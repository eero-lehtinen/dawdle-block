import { Typography, Stack } from "@material-ui/core"
import { ThemeInput } from"./themeInput"
import { TimeConventionInput } from "./timeConventionInput"

/**
 * General options page for options menu.
 */
export const GeneralOptions = (): JSX.Element => {
	return (
		<>
			<Typography variant="h1" sx={{ mb: 2 }}>
				General Options
			</Typography>
			<Stack spacing={3} >
				<ThemeInput />
				<TimeConventionInput />
			</Stack>
		</>
	)
}