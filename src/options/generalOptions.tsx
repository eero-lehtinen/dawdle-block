import { Typography } from "@material-ui/core"
import { ThemeInput } from"./themeInput"

/**
 * General options page for options menu.
 */
export const GeneralOptions = (): JSX.Element => {
	return (
		<>
			<Typography variant="h1" sx={{ mb: 2 }}>
				General Options
			</Typography>
			<ThemeInput />
		</>
	)
}