import { Stack } from "@material-ui/core"
import ThemeInput from "./ThemeInput"
import TimeConventionInput from "./TimeConventionInput"
import TabHeader from "./TabHeader"
/**
 * General options page for options menu.
 */
const GeneralOptions = (): JSX.Element => {
	return (
		<>
			<TabHeader>General Options</TabHeader>
			<Stack spacing={3}>
				<ThemeInput />
				<TimeConventionInput />
			</Stack>
		</>
	)
}

export default GeneralOptions
