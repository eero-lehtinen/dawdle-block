import { Typography, Stack, Box } from "@mui/material"
import { useBGScript } from "@src/shared/BGScriptProvider"
import { useParams } from "react-router-dom"
import ValidatingTimerPicker from "./ValidatingTimePicker"
import TabHeader from "./TabHeader"
import ActiveDaysInput from "./ActiveDaysInput"

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

	if (blockSet === undefined) return <InvalidLinkMessage ordinal={ordinal} />

	return (
		<>
			<TabHeader>{blockSet.data.name}</TabHeader>
			<Stack spacing={3}>
				<Box sx={{ p: 1 }}>
					<Typography variant="h2" sx={{ mb: 1 }}>
						Time Allowed
					</Typography>
					<ValidatingTimerPicker
						label={"Time allowed"}
						inputId={"time-allowed-input"}
						clockType={24}
						savedValue={0 /*timeAllowed*/}
						handleValueAccepted={_newValue => {
							//blockSet.set("timeAllowed", newValue)
						}}
					/>
				</Box>
				<ActiveDaysInput blockSet={blockSet} />
			</Stack>
		</>
	)
}

export default BlockSetOptions
