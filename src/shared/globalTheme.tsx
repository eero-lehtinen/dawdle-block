import { createTheme, Theme } from "@mui/material/styles"
import "@mui/lab/themeAugmentation"

/**
 * Creates a Material UI theme with customized defaults filled in.
 * @param mode dark or light mode
 * @returns created theme
 */
export const createGlobalTheme = (mode: "dark" | "light"): Theme =>
	createTheme({
		typography: {
			h1: {
				fontWeight: 400,
				fontSize: "2.125rem",
				lineHeight: 1.235,
				letterSpacing: "0.00735em",
			},
			h2: {
				fontWeight: 500,
				fontSize: "1.25rem",
				lineHeight: 1.6,
				letterSpacing: "0.0075em",
			},
		},
		palette: {
			mode,
			background:
				mode === "dark"
					? {
							default: "#1F1F1F",
							paper: "#1F1F1F",
					  }
					: {
							default: "#FFF",
							paper: "#FFF",
					  },
		},
	})
