import { Typography, Box, Stack } from "@mui/material"
import { useState } from "preact/hooks"
import { BlockSet } from "@src/background/blockSet"
import ValidatingTimerPicker from "./ValidatingTimePicker"
import { ClockType } from "@src/background/generalOptionsParseTypes"
import { useEffect } from "react"
import { HorizontalRuleRounded } from "@mui/icons-material"

interface ActiveTimeInput {
	blockSet: BlockSet
	clockType: ClockType
	onChanged: () => void
}

/**
 * Input for general options theme property.
 */
const ActiveTimeInput = (props: ActiveTimeInput): JSX.Element => {
	const { blockSet, clockType, onChanged } = props
	const [activeTime, setActiveTime] = useState(blockSet.data.activeTime)

	useEffect(() => {
		setActiveTime(blockSet.data.activeTime)
	}, [blockSet])

	return (
		<Box>
			<Typography variant="h2" sx={{ mb: 1 }}>
				Active Time
			</Typography>
			<Stack direction="row" alignItems="center" spacing={2}>
				<ValidatingTimerPicker
					label={"From time"}
					inputId={"active-time-from-input"}
					clockType={clockType}
					value={activeTime.from}
					handleValueAccepted={newValue => {
						blockSet.set("activeTime", { from: newValue, to: activeTime.to })
						setActiveTime({ from: newValue, to: activeTime.to })
						onChanged()
					}}
				/>
				<HorizontalRuleRounded fontSize="medium" />
				<ValidatingTimerPicker
					label={"To time"}
					inputId={"active-time-to-input"}
					clockType={clockType}
					value={activeTime.to}
					handleValueAccepted={newValue => {
						blockSet.set("activeTime", { from: activeTime.from, to: newValue })
						setActiveTime({ from: activeTime.from, to: newValue })
						onChanged()
					}}
				/>
			</Stack>
		</Box>
	)
}

export default ActiveTimeInput
