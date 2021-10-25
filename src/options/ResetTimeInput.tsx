import { Typography, Box } from "@mui/material"
import { useState } from "preact/hooks"
import { BlockSet } from "@src/background/blockSet"
import ValidatingTimerPicker from "./ValidatingTimePicker"
import { ClockType } from "@src/background/generalOptionsParseTypes"
import { useEffect } from "react"

interface ResetTimeInputProps {
	blockSet: BlockSet
	clockType: ClockType
	onChanged: () => void
}

/**
 * Input for general options theme property.
 */
const ResetTimeInput = (props: ResetTimeInputProps): JSX.Element => {
	const { blockSet, clockType, onChanged } = props
	const [resetTime, setResetTime] = useState(blockSet.data.resetTime)

	useEffect(() => {
		setResetTime(blockSet.data.resetTime)
	}, [blockSet])

	return (
		<Box>
			<Typography variant="h2" sx={{ mb: 1 }}>
				Reset Time
			</Typography>
			<ValidatingTimerPicker
				label={"Reset time"}
				inputId={"reset-time-input"}
				clockType={clockType}
				value={resetTime}
				handleValueAccepted={newValue => {
					blockSet.set("resetTime", newValue)
					setResetTime(newValue)
					onChanged()
				}}
			/>
		</Box>
	)
}

export default ResetTimeInput
