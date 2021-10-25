import { ToggleButton, ToggleButtonGroup, Typography, Box } from "@mui/material"
import { useBGScript } from "@src/shared/BGScriptProvider"
import { useState } from "preact/hooks"

/**
 * Input for general options time convention property.
 */
const TimeConventionInput = (): JSX.Element => {
	const bg = useBGScript()
	const [clockType, setClockType] = useState(bg.generalOptions.data.clockType)

	const handleChange = async (
		event: React.MouseEvent<HTMLElement>,
		newValue: unknown | null
	) => {
		// is null when old selection is selected again.
		if (newValue === null) return
		if (newValue !== 12 && newValue !== 24)
			throw Error(
				"ToggleButtonGroup configured incorrectly. " +
					`ClockTypes do not contain value: "${newValue}"`
			)
		else {
			bg.generalOptions.set("clockType", newValue)
			setClockType(newValue)
			void bg.generalOptions.save()
		}
	}

	return (
		<Box>
			<Typography variant="h2" sx={{ mb: 1 }}>
				Time Convention
			</Typography>
			<ToggleButtonGroup
				color="primary"
				exclusive
				aria-label="time convention"
				value={clockType}
				onChange={handleChange}
			>
				<ToggleButton value={24} aria-label="24-hour clock">
					24-Hour Clock
				</ToggleButton>
				<ToggleButton value={12} aria-label="12-hour clock">
					12-Hour Clock
				</ToggleButton>
			</ToggleButtonGroup>
		</Box>
	)
}

export default TimeConventionInput
