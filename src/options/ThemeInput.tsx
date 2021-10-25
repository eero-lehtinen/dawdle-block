import { ToggleButton, ToggleButtonGroup, Typography, Box } from "@mui/material"
import { LightModeRounded, BrightnessMediumRounded, DarkModeRounded } from "@mui/icons-material"
import { Theme } from "@src/background/generalOptionsParseTypes"
import { useBGScript } from "@src/shared/BGScriptProvider"
import { useState } from "preact/hooks"

/**
 * Input for general options theme property.
 */
const ThemeInput = (): JSX.Element => {
	const bg = useBGScript()
	const [theme, setTheme] = useState<Theme>(bg.generalOptions.data.theme)

	const handleThemeChange = async (
		event: React.MouseEvent<HTMLElement>,
		newTheme: string | null
	) => {
		// newTheme is null when old selection is selected again.
		if (newTheme === null) return
		if (newTheme !== "system" && newTheme !== "light" && newTheme !== "dark")
			throw Error(
				`ToggleButtonGroup configured incorrectly. Themes do not contain string: "${newTheme}"`
			)
		else {
			bg.generalOptions.set("theme", newTheme)
			setTheme(newTheme)
			bg.generalOptions.save()
		}
	}

	return (
		<Box>
			<Typography variant="h2" sx={{ mb: 1 }}>
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
					<BrightnessMediumRounded sx={{ mr: 1 }} />
					System Default
				</ToggleButton>
				<ToggleButton value="light" aria-label="light mode">
					<LightModeRounded sx={{ mr: 1 }} />
					Light Mode
				</ToggleButton>
				<ToggleButton value="dark" aria-label="dark mode">
					<DarkModeRounded sx={{ mr: 1 }} />
					Dark Mode
				</ToggleButton>
			</ToggleButtonGroup>
		</Box>
	)
}

export default ThemeInput
