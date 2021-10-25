import { Typography, Box } from "@mui/material"
import { useState } from "preact/hooks"
import { BlockSet } from "@src/background/blockSet"
import ValidatingTimerPicker from "./ValidatingTimePicker"
import { ClockType } from "@src/background/generalOptionsParseTypes"
import { useEffect } from "react"

interface TimeAllowedInput {
	blockSet: BlockSet
	clockType: ClockType
	onChanged: () => void
}

/**
 * Input for general options theme property.
 */
const TimeAllowedInput = (props: TimeAllowedInput): JSX.Element => {
	const { blockSet, clockType, onChanged } = props
	const [timeAllowed, setTimeAllowed] = useState(blockSet.data.timeAllowed)

	useEffect(() => {
		setTimeAllowed(blockSet.data.timeAllowed)
	}, [blockSet])

	return (
		<Box>
			<Typography variant="h2" sx={{ mb: 1 }}>
				Time Allowed
			</Typography>
			<ValidatingTimerPicker
				label={"Time allowed"}
				inputId={"time-allowed-input"}
				clockType={clockType}
				value={timeAllowed}
				handleValueAccepted={newValue => {
					blockSet.set("timeAllowed", newValue)
					setTimeAllowed(newValue)
					onChanged()
				}}
			/>
		</Box>
	)
}

export default TimeAllowedInput
