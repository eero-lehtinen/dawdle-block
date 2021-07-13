/* eslint-disable no-var, @typescript-eslint/no-unused-vars*/
import { Background } from "./background"

// export background variable for usage in options and popup
declare global {
    interface Window { background: Background | undefined }
}

void (async() => {
	window.background = await Background.create()
})()
