import { render } from "preact"
import { Button } from "@material-ui/core"
import { browser } from "webextension-polyfill-ts"

const App = 
	<Button color="primary" onClick={() => void browser.runtime.openOptionsPage()}>
		Open Options
	</Button>

render(App, document.body)