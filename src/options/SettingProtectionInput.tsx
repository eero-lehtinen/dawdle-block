import { ToggleButton, ToggleButtonGroup, Typography, Stack } from "@material-ui/core"
import { useBGScript } from "@src/shared/BGScriptProvider"
import { useState } from "preact/hooks"
import { defaultTypingTestWordCount } from "../background/generalOptionsParseTypes"
import NumericTextField from "./NumericTextField"

/**
 * Input for general options settings protection and typing test word count property
 */
const SettingProtectionInput = (): JSX.Element => {
	const bg = useBGScript()
	const [settingProtection, setSettingProtection] = useState(
		bg.generalOptions.data.settingProtection
	)

	const [typingTestWordCountValue, setTypingTestWordCountValue] = useState(
		bg.generalOptions.data.typingTestWordCount
	)

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

	const handleTypingTestWordCountSave = async (newValue: number) => {
		const res = await bg.generalOptions.set("typingTestWordCount", newValue)
		if (res.isErr()) return
		setTypingTestWordCountValue(newValue)
	}

	return (
		<Stack alignItems="baseline" spacing={1}>
			<Typography variant="h2" sx={{ mb: 1 }}>
				Protect Settings with a Typing Challenge
			</Typography>
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
				label="Test word count"
				min={0}
				max={500}
				defaultValue={defaultTypingTestWordCount}
				savedValue={typingTestWordCountValue}
				handleValueAccepted={handleTypingTestWordCountSave}
			/>
		</Stack>
	)
}

export default SettingProtectionInput
