
type ClockType = 12 | 24
type SettingsProtection = "never" | "always" | "timerZero"

export class GeneralOptions {
	readonly v = 1
	clockType: ClockType = 24
	displayHelp = true
	darkTheme = false
	settingProtection: SettingsProtection = "never"
	typingTestWordCount = 30
}




