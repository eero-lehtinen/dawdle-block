import { render } from "preact"
import { Options } from "./Options"
import BaseWrapper from "../shared/BaseWrapper"
import "../shared/fonts"

render(
	<BaseWrapper>
		<Options />
	</BaseWrapper>, document.body)