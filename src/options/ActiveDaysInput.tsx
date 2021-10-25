import { ToggleButton, ToggleButtonGroup, Typography, Box } from "@mui/material"
import { useState } from "preact/hooks"
import { BlockSet } from "@src/background/blockSet"

interface ActiveDaysInputProps {
	blockSet: BlockSet
	onChanged: () => void
}

const daysOfTheWeek = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
]

/**
 * Input for general options theme property.
 */
const ActiveDaysInput = (props: ActiveDaysInputProps): JSX.Element => {
	const { blockSet, onChanged } = props
	const [activeDays, setActiveDays] = useState<boolean[]>(blockSet.data.activeDays)

	const handleDaysChange = async (event: React.MouseEvent<HTMLElement>, newValue: number[]) => {
		const newActiveDays = new Array(7).fill(false)
		for (const i of newValue) {
			newActiveDays[i] = true
		}
		blockSet.set("activeDays", newActiveDays)
		setActiveDays(newActiveDays)
		onChanged()
	}

	return (
		<Box sx={{ p: 1 }}>
			<Typography variant="h2" sx={{ mb: 1 }}>
				Active Days of the Week
			</Typography>
			<ToggleButtonGroup
				value={activeDays.map((bool, i) => (bool ? i : null)).filter(x => x !== null)}
				onChange={handleDaysChange}
				color="primary"
				aria-label="active days of the week"
			>
				{daysOfTheWeek.map((day, i) => (
					<ToggleButton key={day} value={i} aria-label={day}>
						<Box width={56 - 22 /* 22 is padding */}>{day.slice(0, 3)}</Box>
					</ToggleButton>
				))}
			</ToggleButtonGroup>
		</Box>
	)
}

export default ActiveDaysInput
