import { render } from "preact"
import { Options } from "./options"
import { BaseWrapper } from "../shared/baseWrapper"
import "../shared/fonts"

render(
	<BaseWrapper>
		<Options />
	</BaseWrapper>, document.body)