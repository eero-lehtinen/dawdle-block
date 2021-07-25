import { Typography } from "@material-ui/core"
import { ThemeInput } from"./themeInput"

/**
 * General options page for options menu.
 */
export const GeneralOptions = (): JSX.Element => {
	return (
		<>
			<Typography variant="h4" component="h1" sx={{ mb: 3 }}>
				General Options
			</Typography>
			<ThemeInput />
		</>
	)
}