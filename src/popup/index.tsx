import { render } from "preact"
import { Button } from "@mui/material"
import { browser } from "webextension-polyfill-ts"
import "../shared/fonts"

const App = (
	<Button color="primary" onClick={() => void browser.runtime.openOptionsPage()}>
		Open Options
	</Button>
)

render(App, document.body)
