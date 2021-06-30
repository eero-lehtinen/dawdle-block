/**
 * This file contains annoy mode banner logic.
 * It's single purpose is to show overtime in the bottom of the window.
 * bg.js calls showTime() and it initializes the display div if needed,
 * and if bg.js stops calling showTime(), this hides the div.
 * Uses dawdleBlockAnnoy "namespace" to not clash with existing definitions.
 */

var dawdleBlockAnnoy = {
	timeoutHandle: undefined,
	init: _ => {
		let link = document.createElement("link")
		link.setAttribute("href", "https://fonts.googleapis.com/css?family=PT+Mono")
		link.setAttribute("rel", "stylesheet")
		document.head.appendChild(link)

		let mainDiv = document.createElement("div")
		mainDiv.setAttribute("id", "dawdleBlockAnnoy")
		document.body.appendChild(mainDiv)
		return mainDiv
	},
	showTime: timeString => {
		let mainDiv = document.getElementById("dawdleBlockAnnoy")

		if (!mainDiv) {
			mainDiv = dawdleBlockAnnoy.init()
		}

		mainDiv.textContent = timeString

		if (mainDiv.className === "hidden") {
			mainDiv.className = ""
		}

		clearTimeout(dawdleBlockAnnoy.timeoutHandle)
		dawdleBlockAnnoy.timeoutHandle = setTimeout(dawdleBlockAnnoy.hideTime, 1500)
	},
	hideTime: _ => {
		let mainDiv = document.getElementById("dawdleBlockAnnoy")
		if (mainDiv) {
			mainDiv.className = "hidden"
		}
	}
}