import {
	ToggleButton,
	ToggleButtonGroup,
	Typography,
	Stack,
	Button,
	TextField,
} from "@material-ui/core"
import { useBGScript } from "@src/shared/BGScriptProvider"
import { useState } from "preact/hooks"
import { clamp } from "../shared/utils"
import { typingTestWordCountDefault } from "../background/generalOptionsParser"
import TypingTestDialog from "./TypingTestDialog"

/**
 * Input for general options settings protection and typing test word count property
 */
const SettingProtectionInput = (): JSX.Element => {
	const bg = useBGScript()
	const [settingProtection, setSettingProtection] = useState(
		bg.generalOptions.data.settingProtection
	)

	const [typingTestWordCountInput, setTypingTestWordCountInput] = useState({
		val: bg.generalOptions.data.typingTestWordCount.toString(),
	})

	const [typingTestOpen, setTypingTestOpen] = useState(false)

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

	const typingTestWordCount = {
		handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			if (e.target.value !== "") {
				const numericVal = e.target.value.replace(/\D/g, "")
				if (numericVal.length === 0) {
					setTypingTestWordCountInput({ val: "" })
				} else {
					setTypingTestWordCountInput({
						val: clamp(parseInt(numericVal, 10), 0, 500).toString(),
					})
				}
			}
		},
		handleEditingFinished: () => {
			if (typingTestWordCountInput.val !== "") {
				void typingTestWordCount.handleSave(parseInt(typingTestWordCountInput.val, 10))
			} else {
				setTypingTestWordCountInput({ val: typingTestWordCountDefault.toString() })
				void typingTestWordCount.handleSave(typingTestWordCountDefault)
			}
		},
		handleSave: async (newValue: number) => {
			const res = await bg.generalOptions.set("typingTestWordCount", newValue)
			if (res.isErr()) {
				// TODO: handle error
			}
		},
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
			<TextField
				variant="filled"
				autoComplete="off"
				id="typing-test-word-count"
				label="Test word count"
				inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
				value={typingTestWordCountInput.val}
				onChange={typingTestWordCount.handleChange}
				onBlur={typingTestWordCount.handleEditingFinished}
				onKeyPress={e => {
					if (e.key === "Enter") typingTestWordCount.handleEditingFinished()
				}}
				sx={{ width: "120px" }}
			/>
			<Button size="large" variant="outlined" onClick={() => setTypingTestOpen(true)}>
				Try It Out
			</Button>
			<TypingTestDialog open={typingTestOpen} onClose={() => setTypingTestOpen(false)} />
		</Stack>
	)
}

export default SettingProtectionInput
