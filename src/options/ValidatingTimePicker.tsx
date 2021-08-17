import { ClockType } from "@src/background/generalOptionsParseTypes"
import { useEffect, useState, useCallback } from "preact/hooks"
import { TextField } from "@material-ui/core"
import { DesktopTimePicker } from "@material-ui/lab"
import dayjs from "dayjs"
import { clamp, dateToTodayMS } from "../shared/utils"

interface ValidatingTimerPickerProps {
	label: string
	inputId: string
	clockType: ClockType
	/** savedValue should change after `handleValueAccepted` is called */
	savedValue: number
	handleValueAccepted: (newValue: number) => void
}

/** Get capturing group and return default if capture is empty */
const getCapturingGroup = (
	match: RegExpMatchArray | null,
	groupNum: number,
	default_: string
): string => {
	if (match === null) return default_
	const group = match[groupNum]
	if (group === undefined || group === "") return default_
	return group
}

/** Validate string to be number and between `min` and `max`. Returns `min` if string is invalid. */
const validateNumStr = (numStr: string, min: number, max: number): string => {
	const num = parseInt(numStr, 10)
	if (isNaN(num)) return min.toString()
	return clamp(num, min, max).toString()
}

/**
 * Tries to guess what user might have wanted to write.
 * Ignores all errors and returns its best guess, that being a valid formatted string.
 * "HH:mm" if clockType = 24, "HH:mm A" if clockType = 12.
 */
const autoCompleteInput = (input: string, clockType: ClockType) => {
	const match = input.match(/(\w*)(:)?(\w*)\s*(\w*)/)

	let hours = getCapturingGroup(match, 1, "0")
	const colon = getCapturingGroup(match, 2, "") !== ""
	let minutes = getCapturingGroup(match, 3, "0")
	let ampm = ""

	if (!colon) {
		minutes = hours.slice(2, 4)
		hours = hours.slice(0, 2)
	}

	let newStr = ""
	if (clockType === 24) {
		hours = validateNumStr(hours, 0, 23)
		minutes = validateNumStr(minutes, 0, 59)
		newStr = `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`
	} else {
		hours = validateNumStr(hours, 0, 13)
		if (hours === "0") hours = "12"
		else if (hours === "13") hours = "11"
		minutes = validateNumStr(minutes, 0, 59)
		ampm = getCapturingGroup(match, 4, "")
		ampm = /pm?/i.test(ampm) ? "PM" : "AM"
		newStr = `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")} ${ampm}`
	}
	return newStr
}

/**
 * TimePicker that allows sloppy inputs and autocompletes all inputs no matter how full of errors.
 */
const ValidatingTimerPicker = (props: ValidatingTimerPickerProps): JSX.Element => {
	const { label, inputId, clockType, savedValue, handleValueAccepted } = props

	const [inputTime, setInputTime] = useState<dayjs.Dayjs>(dayjs(savedValue))
	const [inputStr, setInputStr] = useState(dayjs(savedValue).format("HH:mm"))

	const formatString = useCallback(() => (clockType === 24 ? "HH:mm" : "hh:mm A"), [clockType])
	const ignoreRegExp = () => (clockType === 24 ? /[^\d:]/g : /[^\d: apm]/gi)

	useEffect(() => {
		const time = dayjs("0", "h").millisecond(savedValue)
		setInputTime(time)
		setInputStr(time.format(formatString()))
	}, [savedValue, formatString])

	const handleChange = (value: string) => {
		setInputStr(value.replace(ignoreRegExp(), ""))
	}

	// Auto-complete user text input to fit time format
	const handleEditingFinished = () => {
		const autoCompleted = autoCompleteInput(inputStr, clockType)
		const date = dayjs(autoCompleted, formatString()).toDate()
		handleValueAccepted(dateToTodayMS(date))
	}

	return (
		<>
			<DesktopTimePicker
				label={label}
				value={inputTime}
				ampm={clockType === 12}
				// Gets called when popup is used or text field is changed
				onChange={newValue => {
					if (newValue !== null && newValue.isValid()) {
						setInputTime(newValue)
						setInputStr(newValue.format(formatString()))
					}
				}}
				// Gets called when popup is closed
				onAccept={newValue => {
					if (newValue !== null && newValue.isValid())
						handleValueAccepted(dateToTodayMS(newValue.toDate()))
				}}
				acceptRegex={undefined}
				mask={undefined}
				renderInput={params => {
					const { inputProps, ...rest } = params
					return (
						<TextField
							id={inputId}
							{...rest}
							inputProps={{
								...inputProps,
								value: inputStr,
								placeholder: formatString().replace("A", "A|P"),
							}}
							onChange={e => handleChange(e.target.value)}
							onBlur={handleEditingFinished}
							onKeyPress={e => {
								if (e.key === "Enter") handleEditingFinished()
							}}
							sx={{ width: 160 }}
						/>
					) as React.ReactElement
				}}
			/>
		</>
	)
}

export default ValidatingTimerPicker
