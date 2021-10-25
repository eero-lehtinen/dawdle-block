import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
} from "@mui/material"
import useEffectCleanUpPageUnload from "../shared/useEffectCleanupPageUnload"
import { useState, useEffect } from "preact/hooks"
import TypingTest from "./TypingTest"
import { useBGScript } from "../shared/BGScriptProvider"

interface TypingTestDialogProps {
	open: boolean
	onClose: (success: boolean) => void
}

/**
 * Shows user typing test that must be completed without mistakes to pass.
 * In development mode shift key can be pressed to autocomplete the test.
 */
const TypingTestDialog = (props: TypingTestDialogProps): JSX.Element => {
	const { open, onClose } = props

	const bg = useBGScript()

	const [wordCount, setWordCount] = useState(bg.generalOptions.data.typingTestWordCount)

	useEffectCleanUpPageUnload(() => {
		bg.generalOptions.subscribeChanged("typingTestWordCount", ({ newValue }) =>
			setWordCount(newValue)
		)
	}, [])

	const [generation, setGeneration] = useState(0)

	const [success, setSuccess] = useState(false)
	useEffect(() => {
		if (open) {
			setGeneration(g => g + 1)
			setSuccess(false)
		}
	}, [open])

	const handleClose = () => {
		onClose(success)
	}

	return (
		<Dialog fullWidth maxWidth={"sm"} open={open} onClose={handleClose}>
			<DialogTitle>Unlock Settings Protection</DialogTitle>
			<DialogContent>
				<DialogContentText>
					Type the words below with zero mistakes to unlock protected settings.
				</DialogContentText>
				<TypingTest
					wordCount={wordCount}
					generation={generation}
					onSuccess={() => setSuccess(true)}
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose}>{success ? "Close" : "Cancel"}</Button>
			</DialogActions>
		</Dialog>
	)
}

export default TypingTestDialog
