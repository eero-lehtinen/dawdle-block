import { createTheme } from "@material-ui/core/styles"
import "@material-ui/lab/themeAugmentation"

export const globalTheme = createTheme({
	typography: {
		fontFamily: [
			"-apple-system",
			"BlinkMacSystemFont",
			"\"Segoe UI\"",
			"Roboto",
			"\"Helvetica Neue\"",
			"Arial",
			"sans-serif",
			"\"Apple Color Emoji\"",
			"\"Segoe UI Emoji\"",
			"\"Segoe UI Symbol\"",
		].join(","),
	},
	palette: { 
		mode: "dark",
	},
})