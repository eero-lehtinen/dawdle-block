import { createTheme, Theme } from "@material-ui/core/styles"
import "@material-ui/lab/themeAugmentation"

/**
 * Creates a Material UI theme with customized defaults filled in.
 * @param mode dark or light mode
 * @returns created theme
 */
export const createGlobalTheme = (mode: "dark" | "light"): Theme =>
	createTheme({
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
			mode,
			background: { 
				default: "#1F1F1F",
				paper: "#1F1F1F",
			},
		},
	})