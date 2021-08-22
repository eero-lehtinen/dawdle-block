import { ToggleButton, ToggleButtonGroup, Typography, Stack, Button } from "@material-ui/core"
import { RestartAltRounded } from "@material-ui/icons"
import { useBGScript } from "@src/shared/BGScriptProvider"
import { useState } from "preact/hooks"
import { defaultTypingTestWordCount } from "../background/generalOptionsParseTypes"
import NumericTextField from "./NumericTextField"
import TabHeader from "./TabHeader"
import TypingTest from "./TypingTest"

/**
 * Input for general options settings protection and typing test word count property
 */
const SettingsLock = (): JSX.Element => {
	const bg = useBGScript()
	const [settingProtection, setSettingProtection] = useState(
		bg.generalOptions.data.settingProtection
	)

	const [typingTestWordCount, setTypingTestWordCount] = useState(
		bg.generalOptions.data.typingTestWordCount
	)

	const [typingTestSuccess, setTypingTestSuccess] = useState(false)

	const [typingTestGen, setTypingTestGen] = useState(0)

	const handleSettingProtectionChange = async (
		event: React.MouseEvent<HTMLElement>,
		newValue: unknown | null
	) => {
		// is null when old selection is selected again.
		if (newValue === null) return
		if (newValue !== "never" && newValue !== "always" && newValue !== "timerZero")
			throw Error(
				"ToggleButtonGroup configured incorrectly. " +
					`SettingsProtection doesn't contain value: "${newValue}"`
			)
		else {
			const res = await bg.generalOptions.set("settingProtection", newValue)
			if (res.isOk()) setSettingProtection(newValue)
		}
	}

	const handleTypingTestWordCountChange = async (newValue: number) => {
		const res = await bg.generalOptions.set("typingTestWordCount", newValue)
		if (res.isErr()) return
		setTypingTestSuccess(false)
		setTypingTestWordCount(newValue)
	}

	return (
		<>
			<TabHeader>Settings Lock</TabHeader>
			<Typography variant="h2" sx={{ mb: 1 }}>
				Protect Settings with a Typing Challenge
			</Typography>
			<Stack alignItems="baseline" spacing={1} sx={{ mb: 4 }}>
				<ToggleButtonGroup
					color="primary"
					exclusive
					aria-label="Protect Settings With A Typing Test"
					value={settingProtection}
					onChange={handleSettingProtectionChange}
					sx={{ mb: 1 }}
				>
					<ToggleButton value="never" aria-label="never">
						Never
					</ToggleButton>
					<ToggleButton value="always" aria-label="always">
						Always
					</ToggleButton>
					<ToggleButton value="timerZero" aria-label="when out of time">
						When Out of Time
					</ToggleButton>
				</ToggleButtonGroup>
				<NumericTextField
					inputId="typing-test-word-count"
					label="Challenge word count"
					min={1}
					max={1000}
					defaultValue={defaultTypingTestWordCount}
					savedValue={typingTestWordCount}
					handleValueAccepted={handleTypingTestWordCountChange}
				/>
			</Stack>
			<Typography variant="h2" sx={{ mb: 1 }}>
				Test It Out
			</Typography>
			<Typography>
				Try the challenge here to make sure you are able to pass it. Remember that zero typos
				are allowed.
			</Typography>
			<Stack alignItems="baseline" spacing={1} sx={{ maxWidth: 500 }}>
				<TypingTest
					generation={typingTestGen}
					wordCount={typingTestWordCount}
					onSuccess={() => {
						setTypingTestSuccess(true)
					}}
				/>
				{typingTestSuccess && <Typography>{"Success!"}</Typography>}
				<Button
					size="medium"
					variant="outlined"
					startIcon={<RestartAltRounded />}
					onClick={() => {
						setTypingTestGen(g => g + 1)
						setTypingTestSuccess(false)
					}}
				>
					Reset Challenge
				</Button>
			</Stack>
		</>
	)
}

export default SettingsLock
