import { Typography, Stack, TextField, Box } from "@material-ui/core"
import { useBGScript } from "@src/shared/BGScriptProvider"
import { useParams } from "react-router-dom"
import { DesktopTimePicker } from "@material-ui/lab"
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
	const [timePickerValue, setTimePickerValue] = useState(new Date())
	const [clockType, setClockType] = useState(bg.generalOptions.data.clockType)

	useEffectCleanUpPageUnload(() => {
		bg.generalOptions.subscribeChanged("clockType", ({ newValue }) => setClockType(newValue))
	}, [])

	const blockSet = bg.blockSets.list[parseInt(ordinal, 10) - 1]

	if (blockSet === undefined) return <InvalidLinkMessage ordinal={ordinal} />

	return (
		<>
			<Typography variant="h1" sx={{ mb: 2 }}>
				{blockSet.name}
			</Typography>
			<Stack spacing={3}>
				<Box sx={{ p: 1 }}>
					<Typography variant="h2" sx={{ mb: 1 }}>
						Time Allowed
					</Typography>
					<DesktopTimePicker
						value={timePickerValue}
						ampm={false}
						onChange={newValue => {
							if (newValue !== null) setTimePickerValue(newValue)
						}}
						renderInput={params =>
							(
								<TextField id={"time-allowed-input"} {...params} sx={{ width: 200 }} />
							) as React.ReactElement
						}
					/>
				</Box>
				<Box sx={{ p: 1 }}>
					<Typography variant="h2" sx={{ mb: 1 }}>
						Time Allowed
					</Typography>
					<DesktopTimePicker
						value={timePickerValue}
						ampm={clockType === 12}
						onChange={newValue => {
							if (newValue !== null) setTimePickerValue(newValue)
						}}
						renderInput={params =>
							(<TextField id={"asd"} {...params} sx={{ width: 200 }} />) as React.ReactElement
						}
					/>
				</Box>
			</Stack>
		</>
	)
}

export default BlockSetOptions
