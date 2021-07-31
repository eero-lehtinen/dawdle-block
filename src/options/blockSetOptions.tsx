import { Typography, Stack, TextField } from "@material-ui/core"
import { useBGScript } from "@src/shared/bgScriptProvider"
import { useParams } from "react-router-dom"
import { DesktopTimePicker } from "@material-ui/lab"
import { useState } from "preact/hooks"

/** Message to show when use has typed an url with invalid number. */
const InvalidLinkMessage = ({ ordinal }: { ordinal: string }) => (
	<>
		<Typography variant="h4" component="h1" sx={{ mb: 3 }}>
			Invalid Link: BlockSet number {ordinal} doesn't exist
		</Typography>
		<Typography variant="body1">
			Please choose a valid block set.
		</Typography>
	</>
)

/**
 * BlockSets options page for options menu.
 */
export const BlockSetOptions = (): JSX.Element => {
	const bg = useBGScript()
	const { ordinal } = useParams<{ordinal: string}>()
	const [timePickerValue, setTimePickerValue] = useState(new Date())

	const blockSet = bg.blockSets.list[parseInt(ordinal, 10) - 1]

	if (blockSet === undefined) return <InvalidLinkMessage ordinal={ordinal} />

	return (
		<>
			<Typography variant="h4" component="h1" sx={{ mb: 3 }}>
				{blockSet.name}
			</Typography>
			<Stack spacing={2} >
				<DesktopTimePicker
					label="Basic example"					
					value={timePickerValue}
					ampm={true}
					onChange={(newValue) => {
						if (newValue !== null)
							setTimePickerValue(newValue)
					}}
					renderInput={(params) => (<TextField {...params} />) as React.ReactElement}
				/>
			</Stack>
		</>
	)
}