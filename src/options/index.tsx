import { render } from "preact"
import { Options } from "./options"
import { BaseWrapper } from "../shared/baseWrapper"

render(
	<BaseWrapper>
		<Options />
	</BaseWrapper>, document.body)