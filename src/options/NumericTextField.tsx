import { TextField } from "@mui/material"
import { useState, useEffect } from "preact/hooks"
import { clamp } from "../shared/utils"

interface NumericTextFieldProps {
	label: string
	inputId: string
	min: number
	max: number
	defaultValue: number
	width?: number
	/** savedValue should change after `handleValueAccepted` is called */
	savedValue: number
	handleValueAccepted: (newValue: number) => void
}

/**
 * Generic numeric input. Validates text and inserts defaults if left empty.
 */
const NumericTextField = (props: NumericTextFieldProps): JSX.Element => {
	const { label, inputId, defaultValue, min, max, width, savedValue, handleValueAccepted } =
		props
	const [value, setValue] = useState({ v: savedValue.toString() })

	useEffect(() => {
		setValue({ v: savedValue.toString() })
	}, [savedValue])

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const numericVal = e.target.value.replace(/\D/g, "")
		if (numericVal.length === 0) {
			setValue({ v: "" })
		} else {
			setValue({ v: numericVal })
		}
	}

	const handleEditingFinished = () => {
		if (value.v !== "") {
			const clamped = clamp(parseInt(value.v, 10), min, max)
			setValue({ v: clamped.toString() })
			handleValueAccepted(clamped)
		} else {
			setValue({ v: defaultValue.toString() })
			handleValueAccepted(defaultValue)
		}
	}

	return (
		<TextField
			variant="filled"
			autoComplete="off"
			id={inputId}
			label={label}
			inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
			value={value.v}
			onChange={handleChange}
			onBlur={handleEditingFinished}
			onKeyPress={e => {
				if (e.key === "Enter") handleEditingFinished()
			}}
			sx={{ width: `${width ?? 120}px` }}
		/>
	)
}

export default NumericTextField
