import { Typography, Stack, Box } from "@mui/material"
import { useBGScript } from "@src/shared/BGScriptProvider"
import { useParams } from "react-router-dom"
import ValidatingTimerPicker from "./ValidatingTimePicker"
import TabHeader from "./TabHeader"
import ActiveDaysInput from "./ActiveDaysInput"
import ActiveTimeInput from "./ActiveTimeInput"
import { useState } from "preact/hooks"
import useEffectCleanUpPageUnload from "@src/shared/useEffectCleanupPageUnload"

/** Message to show when use has typed an url with invalid number. */
const InvalidLinkMessage = ({ ordinal }: { ordinal: string }) => (
	<>
		<Typography variant="h4" component="h1" sx={{ mb: 3 }}>
			Invalid Link: BlockSet number {ordinal} doesn't exist
		</Typography>
		<Typography variant="body1">Please choose a valid block set.</Typography>
	</>
)

/**
 * BlockSets options page for options menu.
 */
const BlockSetOptions = (): JSX.Element => {
	const bg = useBGScript()
	const { ordinal } = useParams<{ ordinal: string }>()
	const blockSet = bg.blockSets.list[parseInt(ordinal, 10) - 1]

	const [clockType, setClockType] = useState(bg.generalOptions.data.clockType)

	useEffectCleanUpPageUnload(() => {
		bg.generalOptions.subscribeChanged("clockType", ({ newValue }) => setClockType(newValue))
	}, [])

	if (blockSet === undefined) return <InvalidLinkMessage ordinal={ordinal} />

	const onInputChanged = () => {
		void bg.blockSets.saveBlockSet(blockSet)
	}

	return (
		<>
			<TabHeader>{blockSet.data.name}</TabHeader>
			<Stack spacing={3}>
				<Box>
					<Typography variant="h2" sx={{ mb: 1 }}>
						Time Allowed
					</Typography>
					<ValidatingTimerPicker
						label={"Time allowed"}
						inputId={"time-allowed-input"}
						clockType={clockType}
						value={0 /*timeAllowed*/}
						handleValueAccepted={_newValue => {
							//blockSet.set("timeAllowed", newValue)
						}}
					/>
				</Box>
				<ActiveDaysInput blockSet={blockSet} onChanged={onInputChanged} />
				<ActiveTimeInput blockSet={blockSet} clockType={clockType} onChanged={onInputChanged} />
			</Stack>
		</>
	)
}

export default BlockSetOptions
