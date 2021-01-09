chrome.runtime.getBackgroundPage(function (bg) {
	if (bg.generalOptions.darkTheme == true) {
		document.getElementsByTagName("html")[0].classList.add("dark")
	}
})