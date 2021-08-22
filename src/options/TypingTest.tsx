import { TextField, Box, Typography } from "@material-ui/core"
import { useState, useEffect, useCallback, useRef } from "preact/hooks"
import words1000 from "../shared/words1000"
import { sleep } from "../shared/utils"
import useWindowSize from "../shared/useWindowSize"

declare const __DEV__: boolean

interface TypingTestProps {
	/** Change generation number to reset the test */
	generation: number
	wordCount: number
	onSuccess: () => void
}

/** Get `count` amount of random words from words1000 list */
const randomWords = (count: number) =>
	new Array(count)
		.fill(undefined)
		.map(() => words1000[Math.floor(Math.random() * words1000.length)] as string)

/**
 * Typing test that must be completed without mistakes to pass.
 * The test starts when `open` prop changes from false to true.
 * It works even if the test is in progress.
 * When test is completed successfully, `onSuccess` is called.
 * In development mode shift key can be pressed to autocomplete the test.
 */
const TypingTest = (props: TypingTestProps): JSX.Element => {
	const { generation, onSuccess, wordCount } = props

	const [words, setWords] = useState<string[]>([])
	const [currWordIndex, setCurrWordIndex] = useState(0)
	const [value, setValue] = useState("")
	const [success, setSuccess] = useState(false)
	const [error, setError] = useState(false)

	const init = useCallback(() => {
		setWords(randomWords(wordCount))
		setCurrWordIndex(0)
		setValue("")
		setSuccess(false)
		setError(false)
	}, [wordCount])

	useEffect(() => {
		init()
	}, [generation, init])

	const addChar = (char: string) => {
		if (success) return
		if (words[currWordIndex]?.length === value.length && char === " ") {
			setCurrWordIndex(currWordIndex + 1)
			setValue("")
			if (currWordIndex === words.length - 1) {
				setSuccess(true)
				onSuccess()
			}
		} else if (words[currWordIndex]?.charAt(value.length) === char) {
			setValue(value + char)
			setError(false)
		} else {
			init()
			setError(true)
		}
	}

	const dimensions = useWindowSize()

	const currWordRef = useRef<HTMLSpanElement>(null)
	const setCurrWordRef = useCallback((node: HTMLSpanElement | null) => {
		if (node !== null) node.scrollIntoView(true)
		currWordRef.current = node
	}, [])

	useEffect(() => {
		if (currWordRef.current !== null) currWordRef.current.scrollIntoView(true)
	}, [dimensions])

	const [autoTypeIndex, setAutoTypeIndex] = useState(-1)
	useEffect(() => {
		if (autoTypeIndex > -1) {
			void (async () => {
				await sleep(5)
				const char = words
					.map(w => `${w} `)
					.join("")
					.charAt(autoTypeIndex)
				if (char === "") {
					setAutoTypeIndex(-1)
					return
				}
				addChar(char)
				if (char === " ") setAutoTypeIndex(-1)
				else setAutoTypeIndex(autoTypeIndex + 1)
			})()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoTypeIndex])

	return (
		<>
			<Typography variant="body1" sx={{ mb: 2, mt: 2 }}>
				words left: {words.length - currWordIndex}
			</Typography>
			<Typography
				variant="body1"
				sx={{
					my: 1,
					px: 1,
					overflow: "hidden",
					textJustify: "inter-word",
					textAlign: "justify",
					lineHeight: theme => (theme.typography.body1.lineHeight as number) * 1.2,
					height: theme =>
						`calc(${(theme.typography.body1.lineHeight as number) * 1.2} * ` +
						`${theme.typography.body1.fontSize} * 2)`,
					"& > span > span": { pl: "1px", pr: "1px", color: "text.secondary" },
					"& > span > span.done": { color: "success.main" },
					"& > span > span.current": {
						color: "text.primary",
						bgcolor: "action.hover",
						borderRadius: "2px",
					},
				}}
			>
				{words.map((word, index) => (
					<span key={word + index} ref={index === currWordIndex ? setCurrWordRef : undefined}>
						<span
							className={
								index < currWordIndex ? "done" : index === currWordIndex ? "current" : undefined
							}
						>
							{word}
						</span>{" "}
					</span>
				))}
				<Box component="span" sx={{ display: "block" }}>
					{"\u00A0"}
				</Box>
			</Typography>
			<TextField
				autoComplete="off"
				autoFocus
				id="typing-test-input"
				label="Type the text above"
				fullWidth
				variant="filled"
				error={error}
				helperText={error ? "You made a typo, try again" : " "}
				value={value}
				disabled={success}
				onChange={e => {
					addChar(e.target.value[e.target.value.length - 1] as string)
				}}
				onKeyDown={e => {
					if (e.key === "Enter") addChar(" ")
					else if (__DEV__ && e.key === "Shift") {
						setAutoTypeIndex(
							words
								.slice(0, currWordIndex)
								.map(str => `${str} `)
								.join("").length + value.length
						)
					}
				}}
			/>
		</>
	)
}

export default TypingTest
