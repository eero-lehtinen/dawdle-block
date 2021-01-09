/**
 * This file contains all logic for the options page.
 * Options data is first loaded in bg.js, this file can only modify it.
 * We have a reference to bg, so we can modify options from it.
 */

/* global words1000 */

// saveAs function comes from FileSaver.min.js
/* global saveAs */ 

var filterLookUp = {
	"urlEquals": "url equals",
	"urlContains": "url contains",
	"urlPrefix": "url prefix",
	"urlSuffix": "url suffix",
	"urlRegexp": "url reg exp",
	"ytChannel": "yt channel",
	"ytCategory": "yt category"
}

var bgPage
var blocksetIds = []
var blocksetDatas = []
var blocksetTimesElapsed = []

var generalOptions

chrome.runtime.getBackgroundPage(function (bg) {
	// Store refernces to background script variables
	bgPage = bg
	blocksetIds = bgPage.blocksetIds
	blocksetDatas = bgPage.blocksetDatas
	blocksetTimesElapsed = bgPage.blocksetTimesElapsed
	generalOptions = bgPage.generalOptions
	init()
})

var currentPageId

function init() {
	//If background script hasn't received save data yet, then wait
	if (bgPage.initDone === false) {
		setTimeout(init, 100)
		console.warn("connection failed with background script, trying again...")
		return
	}

	loadTimePickers()
	displayHelp(generalOptions.displayHelp)
	setDarkTheme(generalOptions.darkTheme)
	displayPage(-1)

	displayBlocksetNavs()

	bgPage.callbacks.options = update // Register for updates from background script

	setupJQueryUI()

	if (blocksetDatas.some(blocksetData => blocksetData.annoyMode === true)) {
		ensureAnnoyModePermissions((hasPermissions) => {
			if (!hasPermissions) {
				for (let blocksetData of blocksetDatas) {
					blocksetData.annoyMode = false
				}
				bgPage.saveAllBlocksets()
			}
		})
	}
}

function setTimeAllowed(value, pageId) {
	blocksetDatas[pageId].timeAllowed = value
	$("#timeLeft").text(msToTimeDisplay(blocksetDatas[pageId].timeAllowed - blocksetTimesElapsed[pageId]))
	saveCurrentBlockset()
}

chrome.runtime.onMessage.addListener(function (message, _sender, _sendResponse) {
	if (message.type === "blocksetChanged") {
		if (currentPageId === parseInt(message.id)) {
			displaySites(blocksetDatas[currentPageId].blacklist, "bl")
			displaySites(blocksetDatas[currentPageId].whitelist, "wl")
		}
	}
})

function update() {

	if (currentPageId >= 0) {
		setTimeDisplay($("#timeLeft"), blocksetDatas[currentPageId].timeAllowed - blocksetTimesElapsed[currentPageId])
	}
}

function loadTimePickers() {
	if ($(".timepicker#resetTime").timepicker) {
		$(".timepicker#resetTime").timepicker("destroy")
	}

	$(".timepicker#resetTime").timepicker({
		timeFormat: generalOptions.clockType === 24 ? "HH:mm" : "hh:mm p",
		dynamic: false, dropdown: false, scrollbar: false,
		change: function (time) {
			var ms = dateToMs(time)
			if (blocksetDatas[currentPageId].resetTime !== ms && oldResetTime !== ms) {
				oldResetTime = ms
				ensureProtectedSettingAccess(currentPageId, function (granted) {
					if (!granted) {
						$(".timepicker#resetTime").timepicker("setTime", msToDate(blocksetDatas[currentPageId].resetTime))
						oldResetTime = blocksetDatas[currentPageId].resetTime
						return
					}
					blocksetDatas[currentPageId].resetTime = ms
					saveCurrentBlockset()
				})
			}
		}
	})

	if ($(".timepicker#activeFrom").timepicker) {
		$(".timepicker#activeFrom").timepicker("destroy")
	}

	$(".timepicker#activeFrom").timepicker({
		timeFormat: generalOptions.clockType === 24 ? "HH:mm" : "hh:mm p",
		dynamic: false, dropdown: false, scrollbar: false,
		change: function (time) {
			var ms = dateToMs(time)
			if (blocksetDatas[currentPageId].activeTime.from !== ms && oldActiveTimeFrom !== ms) {
				oldActiveTimeFrom = ms
				ensureProtectedSettingAccess(currentPageId, function (granted) {
					if (!granted) {
						$(".timepicker#activeFrom").timepicker("setTime", msToDate(blocksetDatas[currentPageId].activeTime.from))
						oldActiveTimeFrom = blocksetDatas[currentPageId].activeTime.from
						return
					}
					blocksetDatas[currentPageId].activeTime.from = ms
					saveCurrentBlockset()
				})
			}
		}
	})

	if ($(".timepicker#activeTo").timepicker) {
		$(".timepicker#activeTo").timepicker("destroy")
	}

	$(".timepicker#activeTo").timepicker({
		timeFormat: generalOptions.clockType === 24 ? "HH:mm" : "hh:mm p",
		dynamic: false, dropdown: false, scrollbar: false,
		change: function (time) {
			var ms = dateToMs(time)
			if (blocksetDatas[currentPageId].activeTime.to !== ms && oldActiveTimeTo !== ms) {
				oldActiveTimeTo = ms
				ensureProtectedSettingAccess(currentPageId, function (granted) {
					if (!granted) {
						$(".timepicker#activeTo").timepicker("setTime", msToDate(blocksetDatas[currentPageId].activeTime.to))
						oldActiveTimeTo = blocksetDatas[currentPageId].activeTime.to
						return
					}
					blocksetDatas[currentPageId].activeTime.to = ms
					saveCurrentBlockset()
				})
			}
		}
	})

	if ($(".timepicker#timeAllowed").timepicker) {
		$(".timepicker#timeAllowed").timepicker("destroy")
	}

	$(".timepicker#timeAllowed").timepicker({
		timeFormat: "HH:mm:ss",
		dynamic: false,
		dropdown: false,
		scrollbar: false,
		change: function (time) {
			var timeMs = dateToMs(time)
			if (currentPageId >= 0 && blocksetDatas[currentPageId].timeAllowed !== timeMs && oldAllowedTime !== timeMs) {
				oldAllowedTime = timeMs
				if (blocksetDatas[currentPageId].timeAllowed < timeMs) {
					// Cache value because user may change tabs while the dialog is open
					var pageId = currentPageId
					dialog(
						"Do you want more time to waste?", 
						"Are you really sure you want to slack off even more? It most likely isn't healthy.",
						"Yes", function () {
							ensureProtectedSettingAccess(pageId, function (granted) {
								if (!granted && pageId === currentPageId) {
									$(".timepicker#timeAllowed").timepicker("setTime", msToDate(blocksetDatas[pageId].timeAllowed))
									oldAllowedTime = blocksetDatas[pageId].timeAllowed
									return
								}
								setTimeAllowed(timeMs, pageId)
							})
						}, "Not Really", function () {
							if (pageId === currentPageId) {
								$(".timepicker#timeAllowed").timepicker("setTime", msToDate(blocksetDatas[pageId].timeAllowed))
								oldAllowedTime = blocksetDatas[pageId].timeAllowed
							}
						})
				}
				else {
					setTimeAllowed(timeMs, currentPageId)
				}
			}
		}
	})
}

let oldResetTime = -1
let oldActiveTimeFrom = -1
let oldActiveTimeTo = -1
let oldAllowedTime = -1

function setupJQueryUI() {
	$("ul.nav").sortable({
		axis: "y",
		items: "> li[list='blocksets']",
		update: function (_event, _ui) {
			blocksetIds.length = 0
			var listItems = $("ul.nav > li[list='blocksets']")
			listItems.each(function (_i) {
				blocksetIds.push(parseInt($(this).find("a").attr("id")))
			})
			chrome.storage.sync.set({
				blocksetIds: blocksetIds
			})
		},

		start: function (event, ui) {
			if (ui.item.find("a").attr("class") !== "selected")
				ui.item.find("a").attr("class", "drag")
		},
		stop: function (event, ui) {
			if (ui.item.find("a").attr("class") !== "selected") {
				ui.item.find("a").removeAttr("class")
			}

			if (Math.abs(ui.offset.top - ui.originalPosition.top) <= 12) { // probable accidental drag
				displayPage(ui.item.find("a").attr("id"))
			}
		}

	})
}

function displayBlocksetNavs() {
	$("li.blocksetNav").remove()

	for (var i = 0; i < blocksetIds.length; i++) {

		let blocksetLink = displayBlocksetNav(blocksetIds[i])
		blocksetLink.click(function () {
			cancelTypingTestDialogs()
			displayPage(parseInt($(this).attr("id")))
		})
	}

	if (blocksetIds.length < 50) {
		var listItem = $("<li>", { class: "blocksetNav" }).appendTo("ul.nav")
		var addBlocksetLink = $("<a>")
			.css({ "fontSize": "20px", "padding": "0px 16px 5px 16px", "font-weight": "500" })
			.attr({ href: "#", class: "blocksetLink" })
			.append("+")
		addBlocksetLink.appendTo(listItem)

		addBlocksetLink.click(function () {
			if (blocksetIds.length < 50)
				displayPage(addBlockset())
		})
	}
}

function displayBlocksetNav(id) {
	var listItem = $("<li>", { class: "blocksetNav", list: "blocksets" }).appendTo("ul.nav")
	var blocksetLink = $("<a>", { href: "#", id: id }).append(blocksetDatas[id].name)
	blocksetLink.appendTo(listItem)
	return blocksetLink
}

/** Check if there are typing test dialog windows open, then cancel them */
function cancelTypingTestDialogs() {
	let dialogs = $("#typingTestDialog")
	dialogs.each(function () {
		$(this).find("button.decline").click()
	})
}

//general id=-1, deselect= -10
function displayPage(id) {
	$("#" + currentPageId).removeAttr("class")
	$("#" + id).attr({ class: "selected" })

	currentPageId = id

	$("ul.blockset").hide()
	$("ul.general").hide()
	$(".donate").hide()

	if (id >= 0) {
		$("ul.blockset").show()

		$("input.blocksetRename").hide()
		$("#name").show()

		$("#name").html(blocksetDatas[id].name)

		$("#annoyMode").prop("checked", blocksetDatas[id].annoyMode)
		$("#requireActive").prop("checked", blocksetDatas[id].requireActive)
		$(".timepicker#resetTime").timepicker("setTime", msToDate(blocksetDatas[id].resetTime))
		oldResetTime = -1
		$(".timepicker#timeAllowed").timepicker("setTime", msToDate(blocksetDatas[id].timeAllowed))
		oldAllowedTime = -1
		$(".timepicker#activeFrom").timepicker("setTime", msToDate(blocksetDatas[id].activeTime.from))
		oldActiveTimeFrom = -1
		$(".timepicker#activeTo").timepicker("setTime", msToDate(blocksetDatas[id].activeTime.to))
		oldActiveTimeTo = -1
		setTimeDisplay($("#timeLeft"), blocksetDatas[id].timeAllowed - blocksetTimesElapsed[id])
		for (var i = 0; i < 7; i++) {
			$("#aDay" + i).prop("checked", blocksetDatas[id].activeDays[i])
		}

		$("#blSiteItems").empty()
		$("#wlSiteItems").empty()

		displaySites(blocksetDatas[id].blacklist, "bl")
		displaySites(blocksetDatas[id].whitelist, "wl")
	}
	else if (id === -1) {
		$("ul.general").show()
		$("input[type=radio][name=settingProtection][value=" + generalOptions.settingProtection + "]").prop("checked", true)
		$("input[type=number]#typingTestWordCount").val(generalOptions.typingTestWordCount)
		$("input[type=radio][name=clockType][value=" + generalOptions.clockType + "]").prop("checked", true)
		$("#displayHelp").prop("checked", generalOptions.displayHelp)
		$("#darkTheme").prop("checked", generalOptions.darkTheme)
	}
	else if (id === -2) {
		$(".donate").show()
	}
	else if (id === -10) {
		// Deselect
	}
}

function displaySites(list, type) {
	if (type === "bl") {
		$("#blSiteItems").empty()
	}
	else if (type === "wl") {
		$("#wlSiteItems").empty()
	}
	for (let i = 0; i < list.length; i++) {
		let siteValue = list[i].value
		let siteHtml = list[i].value
		if (list[i].type === "ytChannel" || list[i].type === "ytCategory") {
			siteValue = list[i].value.name + " " + list[i].value.id
			siteHtml = list[i].value.name + " <span style='color:grey'>" + list[i].value.id + "</span>"
		}
		let siteItem = $("<li>", { class: "siteItem", id: type + "Item" + i }).prependTo("#" + type + "SiteItems")
		$("<span>", { class: "filter" }).html(filterLookUp[list[i].type] + ":").appendTo(siteItem)
		$("<span>", { class: "site", title: siteValue }).html(siteHtml).appendTo(siteItem)
		let button = $("<button>", { class: "close", name: "deleteSite" })
			.html("<img src='images/cancel.png'>").appendTo(siteItem)
		if (type === "bl") {
			button.on("click", function () {
				ensureProtectedSettingAccess(currentPageId, function (granted) {
					if (!granted)
						return
					removeSite(type, button)
				})
			})
		}
		else {
			button.on("click", function () {
				removeSite(type, button)
			})
		}
	}
}

function addSite(toList, select, input, callback) {
	if (select.val() === "ytChannel") {
		bgPage.httpGetAsync("https://www.googleapis.com/youtube/v3/channels?part=snippet&id=" + 
				input.val() + "&fields=items(id%2Csnippet%2Ftitle)&key=" + bgPage.API_KEY, function (response) {
			if (response.error) {
				console.error(`Could not check channel with id ${input.val()}, error: ${response.error}`)
				dialog("Error", "Could not communicate with youtube api.<br>Reason: " + response.error, "OK")
				return
			}
			var object = JSON.parse(response.message)

			if (object.items.length !== 0) {
				toList.push(bgPage.bsItem(select.val(), [object.items[0].snippet.title, object.items[0].id]))
				callback()
			}
			else {
				dialog("Error", "This channel doesn't exist, faulty id: " + input.val(), "OK")
			}
		})
	}
	else if (select.val() === "ytCategory") {
		if (bgPage.YT_CATEGORY_NAMES_BY_ID[input.val()]) {
			toList.push(bgPage.bsItem(select.val(), [bgPage.YT_CATEGORY_NAMES_BY_ID[input.val()], input.val()]))
			callback()
		}
		else {
			dialog("Error", "This category id doesn't exist, faulty id: " + 
				input.val() + "<br> <a href='#' name='allCategories'>list of all categories by their ids</a>", "OK")
		}
	}
	else if (select.val() === "urlRegexp") {
		try {
			new RegExp(input.val())
			toList.push(bgPage.bsItem(select.val(), input.val()))
			callback()
		}
		catch (e) {
			dialog("Error", e.message + ".", "OK")
		}
	}
	else {
		toList.push(bgPage.bsItem(select.val(), input.val()))
		callback()
	}
}

function removeSite(type, button) {
	if (type === "bl") {
		ensureProtectedSettingAccess(currentPageId, function (granted) {
			if (!granted)
				return
			$("#blSiteItems").empty()
			blocksetDatas[currentPageId].blacklist.splice(parseInt(button.parent().attr("id").substring(6)), 1)
			displaySites(blocksetDatas[currentPageId].blacklist, type)
			saveCurrentBlockset()
		})
	}
	else {
		$("#wlSiteItems").empty()
		blocksetDatas[currentPageId].whitelist.splice(parseInt(button.parent().attr("id").substring(6)), 1)
		displaySites(blocksetDatas[currentPageId].whitelist, type)
		saveCurrentBlockset()
	}
}

function addBlockset(newData) {
	var newBlocksetId = findNewBlocksetId()
	blocksetIds.push(newBlocksetId)
	blocksetTimesElapsed[newBlocksetId] = 0

	if (newData) {
		blocksetDatas[newBlocksetId] = newData
		bgPage.addAbsentItems(blocksetDatas[newBlocksetId], bgPage.defaultBlockset())
	}
	else {
		let newName = getNewBlocksetName()
		blocksetDatas[newBlocksetId] = bgPage.defaultBlockset()
		blocksetDatas[newBlocksetId].name = newName
	}

	chrome.storage.sync.set({
		blocksetIds: blocksetIds,
		blocksetTimesElapsed: blocksetTimesElapsed,
		[newBlocksetId]: blocksetDatas[newBlocksetId]
	})

	displayBlocksetNavs()

	if (blocksetIds.length >= 50) {
		dialog(
			"Block set maximum reached", 
			"You have reached the maximum of 50 block sets. Consider combining their rules.", 
			"OK"
		)
	}

	chrome.runtime.sendMessage({
		type: "blocksetChanged",
		id: newBlocksetId
	})

	return newBlocksetId
}


function getNewBlocksetName(copyName) {
	if (copyName) {
		let duplicateNumber = 0
		let newName = `${copyName}(${duplicateNumber})`
		while (!isUniqueBSName(newName)) {
			duplicateNumber++
			newName = `${copyName}(${duplicateNumber})`
		}
		return newName
	}
	else {
		let bsNumber = 1
		let newName = `Block set ${bsNumber}`
		while (!isUniqueBSName(newName)) {
			bsNumber++
			newName = `Block set ${bsNumber}`
		}
		return newName
	}
}

function isUniqueBSName(blocksetName) {
	for (let bsId in blocksetDatas) {
		if (blocksetName === blocksetDatas[bsId].name) {
			return false
		}
	}
	return true
}

function deleteBlockset(id) {
	if (blocksetDatas[id] === undefined)
		return

	delete blocksetDatas[id]

	chrome.storage.sync.remove(id.toString())

	blocksetIds.splice(blocksetIds.indexOf(parseInt(id)), 1)
	delete blocksetTimesElapsed[id]

	chrome.storage.sync.set({
		blocksetIds: blocksetIds,
		blocksetTimesElapsed: blocksetTimesElapsed
	})

	displayBlocksetNavs()

	if (blocksetIds.length === 0)
		displayPage(-1)
	else
		displayPage(blocksetIds[blocksetIds.length - 1])

	chrome.runtime.sendMessage({
		type: "blocksetDeleted",
		id: id
	})

}

function findNewBlocksetId() {
	let i = 0
	while (i < blocksetIds.length) {
		if (!blocksetIds.includes(i)) {
			return i
		}
		i++
	}
	return i
}


let saveIndicatorTimeout

/**
 * Show message about success or failure if errorMessage is set
 * @param {string} errorMessage
 */
function showSaveIndicator(errorMessage = undefined) {
	let saveIndicator = $("#saveIndicator")
	saveIndicator.addClass("show")

	if (errorMessage) {
		saveIndicator.children("span").text("Save failed: " + humanizeSaveErrorMsg(errorMessage))
	}
	else {
		saveIndicator.children("span").text("Saved")
	}

	if (saveIndicator.hasClass("success"))
		saveIndicator.removeClass("success")
	if (saveIndicator.hasClass("error"))
		saveIndicator.removeClass("error")

	let lifeTime = 2000
	if (errorMessage) {
		lifeTime = 15000
		saveIndicator.addClass("error")
	}
	else {
		saveIndicator.addClass("success")
	}

	clearTimeout(saveIndicatorTimeout)
	saveIndicatorTimeout = setTimeout(() => { $("#saveIndicator").removeClass("show") }, lifeTime)
}

function saveCurrentBlockset() {
	bgPage.saveBlockset(currentPageId, error => {
		if (!error) {
			showSaveIndicator()

			chrome.runtime.sendMessage({
				type: "blocksetChanged",
				id: currentPageId
			})
		}
		else {
			showSaveIndicator(error)
		}
	})
}

function msToTimeDisplay(duration) {
	var isNegative = (duration < 0)

	duration = Math.abs(duration)

	var seconds = parseInt((duration / 1000) % 60)
	var minutes = parseInt((duration / (1000 * 60)) % 60)
	var hours = parseInt((duration / (1000 * 60 * 60)) % 24)

	hours = (hours < 10) ? "0" + hours : hours
	minutes = (minutes < 10) ? "0" + minutes : minutes
	seconds = (seconds < 10) ? "0" + seconds : seconds

	return (isNegative ? "-" : "") + hours + ":" + minutes + ":" + seconds
}

function msToDate(ms) {
	var h = parseInt((ms / (1000 * 60 * 60)) % 24)
	var m = parseInt((ms / (1000 * 60)) % 60)
	var s = parseInt((ms / 1000) % 60)
	var date = new Date(0)
	date.setHours(h, m, s)
	return date
}

function dateToMs(time) {
	return (time.getSeconds() * 1000) + (time.getMinutes() * 60000) + (time.getHours() * 3600000)
}

// Update dom element text to time in ms
function setTimeDisplay(element, time) {
	element.text(msToTimeDisplay(time))

	if (time < 0) {
		if (!element.hasClass("red")) {
			element.addClass("red")
		}
	}
	else {
		if (element.hasClass("red")) {
			element.removeClass("red")
		}
	}
}

/** Contains cached protected access booleans for each blockset, blockset id as a key, boolean as a value.
 * General settings has the key -1 */
let protectedAccess = {}

/** 
 * Some settings are protected from impulsive editing, 
 * test user with a typing test or do nothing based on protection settings.
 * 
 * Calls callback with true if granted
 * @param {Number} bsId block set id to check, use -1 for general settings
 * @param {function} callback returns (bool, int), bool is granted and int is block set id
 * */
function ensureProtectedSettingAccess(bsId, callback) {
	if (protectedAccess[bsId] === true) {
		callback(true, bsId)
		return
	}

	else if (protectedAccess[bsId] === undefined) {
		protectedAccess[bsId] = false
	}

	if (generalOptions.settingProtection === "never") {
		// Access granted always, never do typing test
		protectedAccess[bsId] = true
		callback(true, bsId)
	}
	else if (generalOptions.settingProtection === "always") {
		// Always do typing test the first time user tries to edit in this session
		typingTestDialog(bsId, function (success) {
			if (success) protectedAccess[bsId] = true

			callback(protectedAccess[bsId], bsId)
		})
	}
	else if (generalOptions.settingProtection === "timerZero") {
		// If timer is more than zero, don't do typing test
		let test = true
		if (bsId >= 0) {
			if (blocksetTimesElapsed[bsId] < blocksetDatas[bsId].timeAllowed)
				test = false
		}
		else { // if trying to edit general settings
			if (blocksetTimesElapsed.some((timeElapsed, index) => {
				if (blocksetDatas[index]) 
					return timeElapsed < blocksetDatas[index].timeAllowed
				else
					return false
			}))
				test = false
		}

		if (test) {
			typingTestDialog(bsId, function (success) {
				if (success) protectedAccess[bsId] = true
				callback(protectedAccess[bsId], bsId)
			})
		}
		else {
			// don't set cache because we may need to do test when timer hits zero
			// protectedAccess[bsId] = true; 
			callback(true, bsId)
		}
	}
}


let dialogWindow
/**
 * Tests user in a typing test, calls callback with boolean based on success
 * @param {function} callback 
 */
function typingTestDialog(bsId, callback) {
	cancelTypingTestDialogs()
	dialogWindow = dialog("Typing Test: Open Protected Settings", $("#typingTestContent").html(),
		undefined, undefined, "Cancel", () => { if (!protectedAccess[bsId]) callback(false) })

	dialogWindow.attr("id", "typingTestDialog")
	dialogWindow.css("width", "450px")

	doTest(function (result) {
		callback(result)
	})
}


function doTest(callback) {

	let tryAgain
	let tryAgainTimeout
	let testInput = dialogWindow.find("#typingTestInput")
	let testDisplay = dialogWindow.find("#typingTestDisplay")
	let liveWordCount = dialogWindow.find("#liveWordCount")
	let testWords = randomWordList(generalOptions.typingTestWordCount, words1000)
	let currentPos = 0
	testInput.focus()
	updateValues()

	function updateValues() {
		testDisplay.html(testWords.join(" "))
		testInput.val("")
		liveWordCount.html(testWords.length + " words left")
		currentPos = 0
	}

	testInput.on("keyup", function (e) {
		// Swallow first space or enter because they may get triggered when opening this dialog from a text input
		if (currentPos === 0 && (e.key === " " || e.key === "Enter"))
			return

		let curTextChar
		if (currentPos === testWords[0].length)
			curTextChar = " "
		else
			curTextChar = testWords[0].charAt(currentPos)

		if (e.key === curTextChar ||
            (curTextChar === " " && (e.key === " " || e.key === "Enter"))) {
			currentPos++
			if (e.key === " " || e.key === "Enter") {

				// Success
				if (testWords.length === 1) {
					dialogWindow.find("button.decline").html("OK")
					dialogWindow.find("#typingTestSuccess").html("Access granted")
					callback(true)
				}

				testWords.shift()
				updateValues()
			}
		}
		else {
			// Failure, try again
			if (!tryAgain) {
				tryAgain = $("<p></p>").attr("id", "testTryAgain").text("Try again.")
				tryAgain.insertAfter(dialogWindow.find("p")[0])
			}

			tryAgain.css("font-weight", "bold")
			clearTimeout(tryAgainTimeout)
			tryAgainTimeout = setTimeout(function () { tryAgain.css("font-weight", "normal") }, 1000)

			testWords = randomWordList(generalOptions.typingTestWordCount, words1000)
			updateValues()
		}
	})
}

/* exported readLocalFile */
function readLocalFile(fileName, callback) {
	chrome.runtime.getPackageDirectoryEntry(function (root) {
		root.getFile(fileName, {}, function (fileEntry) {
			fileEntry.file(function (file) {
				var reader = new FileReader()
				reader.onloadend = function (_e) {
					callback(this.result)
				}
				reader.readAsText(file)
			})
		})
	})
}

function randomWordList(length, fromWords) {
	let words = []
	for (var i = 0; i < length; i++) {
		words.push(fromWords[getRandomInt(0, fromWords.length)])
	}
	return words
}

function getRandomInt(min, max) {
	min = Math.ceil(min)
	max = Math.floor(max)
	return Math.floor(Math.random() * (max - min)) + min //The maximum is exclusive and the minimum is inclusive
}

/**
 * Creates dialog window with given arguments and returns the window as a jquery object
 * @param {string} title Dialog main title
 * @param {string} text Content for the dialog, can be html stringified
 * @param {string} acceptText Text for accept button
 * @param {function} onAccept Callback for pressing accept button
 * @param {string} declineText Text for decline button
 * @param {function} onDecline Callback for pressing decline button
 */
function dialog(title, text, acceptText, onAccept, declineText, onDecline) {
	var dWindow = $("<div>", { class: "dialog" }).appendTo($("body"))
	var topBar = $("<div>", { class: "topBar" }).appendTo(dWindow)
	$("<span>").html(title).appendTo(topBar)

	var textBox = $("<div>", { class: "text" }).html(text).appendTo(dWindow)
	var botBar = $("<div>", { class: "botBar" }).appendTo(dWindow)
	if (declineText) {
		let decline = $("<button>").addClass("decline").html(declineText).appendTo(botBar)
		decline.on("click", function () {
			if (onDecline)
				onDecline()
			dWindow.remove()
		})
	}

	if (acceptText) {
		let accept = $("<button>").addClass("accept").html(acceptText).appendTo(botBar)
		accept.on("click", function () {
			if (onAccept)
				onAccept()
			dWindow.remove()
		})
	}

	dWindow.draggable({ handle: topBar, scroll: false })

	dWindow.css("margin-top", -(dWindow.height() / 2) + "px")

	var link = textBox.find("a")
	if (link) {
		if (link.attr("name") === "allCategories") {
			link.on("click", function () { listAllCategories() })
		}
		if (link.attr("name") === "ytAdding") {
			link.on("click", function () { 
				dialog("Adding YouTube channels/categories", $("div#help_ytAdding_text").html(), "OK") 
			})
		}
	}

	return dWindow
}

function listAllCategories() {
	var textBox = $("<div>")
	var table = $("<table>").html("<tr> <td></td> <td></td> </tr>")
	table.appendTo(textBox)

	var leftList = $("<ul>")
	leftList.appendTo(table.find("td:first"))
	var rightList = $("<ul>")
	rightList.appendTo(table.find("td:last"))

	var keys = Object.keys(bgPage.YT_CATEGORY_NAMES_BY_ID)
	var halfLength = Math.ceil(keys.length / 2)

	for (var i = 0; i < keys.length; i++) {
		var toList = (i < halfLength) ? leftList : rightList
		$("<li>").text(keys[i] + ": " + bgPage.YT_CATEGORY_NAMES_BY_ID[keys[i]]).appendTo(toList)
	}

	dialog("Categories by id", textBox.html(), "OK")
}

function displayHelp(bool) {
	if (bool === true)
		$("button[id^=help_]").show()
	else
		$("button[id^=help_]").hide()
}

function setDarkTheme(bool) {
	generalOptions.darkTheme = bool
	if (bool === true)
		$("html").attr({ class: "dark" })
	else
		$("html").removeAttr("class")
}

function diskDownloadData() {

	var savesJson = {
		blocksetDatas: blocksetDatas,
		generalOptions: generalOptions
	}

	var blob = new Blob([JSON.stringify(savesJson)], { type: "application/json;charset=utf-8" })
	saveAs(blob, "Dawdle_block_save_" + (new Date).toLocaleDateString() + ".json")
}

function diskLoadData(file) {
	var reader = new FileReader()
	reader.onload = function (e) {
		var saves = JSON.parse(e.target.result)
		var feedback = "Save file loaded"
		if (saves.blocksetDatas) {
			for (let key in saves.blocksetDatas) {
				if (blocksetIds.length < 50) {
					addBlockset(saves.blocksetDatas[key])
				}
			}
			bgPage.saveAllBlocksets()
		}
		else {
			feedback += " (no block sets found)"
		}
		if (saves.generalOptions) {
			generalOptions = saves.generalOptions
			saveGeneralOptions()
		}
		else {
			feedback += " (no general options found)"
		}
		displayBlocksetNavs()
		displayPage(currentPageId)
		$("#fileIndicator").text(feedback).show().fadeOut(3000)
	}

	reader.readAsText(file)
}

function saveGeneralOptions() {
	chrome.storage.sync.set({
		generalOptions: generalOptions
	}, function () {
		if (chrome.runtime.lastError) {
			showSaveIndicator(chrome.runtime.lastError.message)
			console.log(chrome.runtime.lastError.message)
		}
		else {
			showSaveIndicator()
		}
	})

	chrome.runtime.sendMessage({
		type: "generalOptionsChanged"
	})
}

/**
 * 
 * @param {string} errorMsg 
 */
function humanizeSaveErrorMsg(errorMsg) {
	// QUOTA_BYTES is for chrome, QuotaExceededError is for firefox
	if (errorMsg.includes("QUOTA_BYTES") || errorMsg.includes("QuotaExceededError")) {
		return "Too many rules in blacklist or whitelist! Remove some to continue saving!"
	}

	// chrome watches write operations, firefox seems to not care
	else if (errorMsg.includes("WRITE_OPERATIONS")) {
		return "Too many changes in quick succession! Wait a little and slow down to continue saving!"
	}
	else {
		return errorMsg
	}
}


$("button#donate").click(function () {
	chrome.runtime.sendMessage({
		type: "donate"
	})
})

$("#-2").click(function () {
	cancelTypingTestDialogs()
	displayPage(-2)
})

$("#-1").click(function () {
	cancelTypingTestDialogs()
	displayPage(-1)
})

//---Blockset---

var deleteDialog
$("#delete").on("click", function () {
	ensureProtectedSettingAccess(currentPageId, function (granted) {
		if (!granted)
			return

		if (deleteDialog) {
			deleteDialog.remove()
			deleteDialog = undefined
		}

		deleteDialog = dialog("Delete block set: " + blocksetDatas[currentPageId].name,
			"This block set will be deleted permanently. Are you sure?", "Delete", function () {
				deleteBlockset(currentPageId)
			}, "Cancel", undefined)
	})
})

$("#duplicate").on("click", function () {
	var newData = JSON.parse(JSON.stringify(blocksetDatas[currentPageId])) // deep copy
	newData.name = getNewBlocksetName(newData.name)
	addBlockset(newData)
	displayPage(currentPageId)
})

$("#rename").on("click", function () {
	$("div.main").scrollTop(0)
	$("#name").hide()
	$("input.blocksetRename").val(blocksetDatas[currentPageId].name)
	$("input.blocksetRename").show().focus()
})

$("input.blocksetRename").on("blur keypress", function (e) {
	if (e.originalEvent.type === "blur" || (e.originalEvent.type === "keypress" && e.originalEvent.key === "Enter")) {
		var newName = $("input.blocksetRename").val()
		if (newName) {
			blocksetDatas[currentPageId].name = newName
			saveCurrentBlockset()
			$("input.blocksetRename").val("")
			$("input.blocksetRename").hide()
			$("#name").show()
			displayBlocksetNavs()
			displayPage(currentPageId)
		}
	}
})

$("#blacklistAdd").on("click", blacklistAddSite)
$("#blacklistInput").on("keypress", function (event) {
	if (event.originalEvent.key === "Enter")
		blacklistAddSite()
})

function blacklistAddSite() {
	if ($("#blacklistInput").val()) {
		addSite(blocksetDatas[currentPageId].blacklist, $("#blacklistSelect"), $("#blacklistInput"), function () {
			$("#blacklistInput").val("")
			saveCurrentBlockset()
			displaySites(blocksetDatas[currentPageId].blacklist, "bl")
		})
	}
}

$("#whitelistAdd").on("click", function () {
	ensureProtectedSettingAccess(currentPageId, function (granted) {
		if (!granted)
			return
		whitelistAddSite()
	})
})

$("#whitelistInput").on("keypress", function (event) {
	if (event.originalEvent.key === "Enter") {
		ensureProtectedSettingAccess(currentPageId, function (granted) {
			if (!granted)
				return
			whitelistAddSite()
		})
	}
})

function whitelistAddSite() {
	if ($("#whitelistInput").val()) {
		addSite(blocksetDatas[currentPageId].whitelist, $("#whitelistSelect"), $("#whitelistInput"), function () {
			$("#whitelistInput").val("")
			saveCurrentBlockset()
			displaySites(blocksetDatas[currentPageId].whitelist, "wl")
		})
	}
}

$("input[id^=aDay]").on("change", function () {
	let dayIndex = $(this).attr("id").slice("aDay".length)
	ensureProtectedSettingAccess(currentPageId, function (granted) {
		if (!granted) {
			$(`input[id=aDay${dayIndex}]`).prop("checked", blocksetDatas[currentPageId].activeDays[dayIndex])
			return
		}
		blocksetDatas[currentPageId].activeDays[dayIndex] = $(`input[id=aDay${dayIndex}]`).prop("checked")
		saveCurrentBlockset()
	})
})

$("#requireActive").on("change", function () {
	let checkBox = $(this)
	ensureProtectedSettingAccess(currentPageId, function (granted) {
		if (!granted) {
			$("#requireActive").prop("checked", blocksetDatas[currentPageId].requireActive)
			return
		}
		blocksetDatas[currentPageId].requireActive = checkBox.prop("checked")
		saveCurrentBlockset()
	})
})

$("#annoyMode").on("change", function () {
	var checkBox = $(this)
	if (checkBox.prop("checked")) {
		ensureAnnoyModePermissions(function (havePermissions) {
			if (havePermissions) {
				ensureProtectedSettingAccess(currentPageId, function (granted) {
					if (!granted) {
						$("#annoyMode").prop("checked", blocksetDatas[currentPageId].requireActive)
						return
					}
					blocksetDatas[currentPageId].annoyMode = $("#annoyMode").prop("checked")
					saveCurrentBlockset()
				})
			}
			else {
				checkBox.prop("checked", false)
			}
		})
	}
	else {
		ensureProtectedSettingAccess(currentPageId, function (granted) {
			if (!granted) {
				$("#annoyMode").prop("checked", blocksetDatas[currentPageId].requireActive)
				return
			}
			blocksetDatas[currentPageId].annoyMode = $("#annoyMode").prop("checked")
			saveCurrentBlockset()
		})
	}
})

function ensureAnnoyModePermissions(callback) {
	chrome.permissions.contains({
		origins: ["<all_urls>"]
	}, (res) => {
		if (res) {
			callback(true)
		}
		else {
			var textObj = $("#help_annoyMode_permission_text")
			dialog(textObj.attr("header"), textObj.html(), "Continue", () => {
				// On continue
				chrome.permissions.request({
					origins: ["<all_urls>"]
				}, (granted) => {
					if (granted) {
						callback(true)
					} 
					else {
						callback(false)
					}
				})
			}, "Cancel", () => {
				callback(false)
			})
		}
	})
}


//---General options---

$("input[type=number]#typingTestWordCount").on("change", function () {
	let input = $(this)
	if (parseInt(input.val()) > 400) {
		input.val(400)
	}
	else if (parseInt(input.val()) < 1) {
		input.val(1)
	}

	ensureProtectedSettingAccess(-1, function (granted) {
		if (!granted) {
			input.val(generalOptions.typingTestWordCount)
			return
		}
		generalOptions.typingTestWordCount = parseInt(input.val())
		saveGeneralOptions()
	})
})

$("input[type=radio][name=settingProtection]").on("change", function () {
	ensureProtectedSettingAccess(-1, function (granted) {
		if (!granted) {
			$("input[type=radio][name=settingProtection][value=" + generalOptions.settingProtection + "]")
				.prop("checked", true)
			return
		}
		generalOptions.settingProtection = $("input[type=radio][name=settingProtection]:checked").val()
		saveGeneralOptions()

		// Reset all protected access caches
		protectedAccess = {}
		// But allow general settings access to allow users to easily undo mistakes
		protectedAccess[-1] = true
	})
})

$("input[type=radio][name=clockType]").on("change", function () {
	generalOptions.clockType = parseInt($(this).val())
	saveGeneralOptions()
	loadTimePickers()
})

$("#displayHelp").on("change", function () {
	generalOptions.displayHelp = $(this).prop("checked")
	displayHelp(generalOptions.displayHelp)
	saveGeneralOptions()
})

$("#darkTheme").on("change", function () {
	generalOptions.darkTheme = $(this).prop("checked")
	setDarkTheme(generalOptions.darkTheme)
	saveGeneralOptions()
})

$("#whitelistSelect").on("change", function () {
	var input = $("#whitelistInput")
	if ($(this).val().startsWith("url")) {
		input.attr("placeholder", "e.g. www.youtube.com/watch?v=useful_video")
	}
	else if ($(this).val() === "ytChannel") {
		input.attr("placeholder", "e.g. UC2C_jShtL725hvbm1arSV9w")
	}
	else if ($(this).val() === "ytCategory") {
		input.attr("placeholder", "e.g. 10")
	}
	input.focus()
})

$("#blacklistSelect").on("change", function () {
	var input = $("#blacklistInput")
	if ($(this).val().startsWith("url")) {
		input.attr("placeholder", "e.g. www.youtube.com")
	}
	else if ($(this).val() === "ytChannel") {
		input.attr("placeholder", "e.g. UC2C_jShtL725hvbm1arSV9w")
	}
	else if ($(this).val() === "ytCategory") {
		input.attr("placeholder", "e.g. 24")
	}
	input.focus()
})

$("button.help").on("click", function () {
	var text = $("#" + $(this).attr("id") + "_text")
	dialog(text.attr("header"), text.html(), "OK")
})

$("button#export").on("click", function () {
	diskDownloadData()
})

$("input#chooseFileHidden").on("change", function () {
	if ($(this).prop("files")[0] === undefined) {
		$("button#import").prop("disabled", true)
		$("span#chooseFileLabel").text("No file chosen")
	}
	else {
		$("button#import").prop("disabled", false)
		$("span#chooseFileLabel").text($(this).prop("files")[0].name)
	}
})

$("button#chooseFile").on("click", function () {
	$("input#chooseFileHidden").click()
})

$("button#import").on("click", function () {
	diskLoadData($("input#chooseFileHidden").prop("files")[0])
})