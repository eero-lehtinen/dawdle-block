import { ToggleButton, ToggleButtonGroup, Typography } from "@material-ui/core"
import { LightModeRounded, BrightnessMediumRounded, DarkModeRounded } from "@material-ui/icons"
import { Theme } from "@src/background/generalOptionsParser"
import { useBGScript } from "@src/shared/bgScriptProvider"
import { useState } from "preact/hooks"

/**
 * General options page for options menu.
 */
export const GeneralOptions = (): JSX.Element => {
	const bg = useBGScript()
	const [theme, setTheme] = useState<Theme>(bg.generalOptions.data.theme)

	const handleThemeChange = (
		event: React.MouseEvent<HTMLElement>,
		newTheme: string | null,
	) => {
		// newTheme is null when old selection is selected again.
		if (newTheme === null)
			return
		if (newTheme !== "system" && newTheme !== "light" && newTheme !== "dark")
			throw Error("ToggleButtonGroup configured incorrectly. " +
				`Themes do not contain string: "${newTheme}"`)
		else
			setTheme(newTheme)
	}

	return (
		<>
			<Typography variant="h3" component="h1" sx={{ mb: 4 }}>
				General Options
			</Typography>
			<Typography variant="h6" component="h2" sx={{ mb: 1 }}>
				Theme
			</Typography>
			<ToggleButtonGroup
				color="primary"
				exclusive
				aria-label="theme"
				value={theme}
				onChange={handleThemeChange}
			>
				<ToggleButton value="system" aria-label="system default">
					<BrightnessMediumRounded sx={{ mr: 1 }} />System Default
				</ToggleButton>
				<ToggleButton value="light" aria-label="light mode">
					<LightModeRounded sx={{ mr: 1 }} />Light Mode
				</ToggleButton>
				<ToggleButton value="dark" aria-label="dark mode">
					<DarkModeRounded sx={{ mr: 1 }} />Dark Mode
				</ToggleButton>
			</ToggleButtonGroup>
		</>
	)
}