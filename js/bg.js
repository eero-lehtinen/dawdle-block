/* global fflate */

/* exported YT_CATEGORY_NAMES_BY_ID */
var YT_CATEGORY_NAMES_BY_ID = {
	1: "Film & Animation",
	2: "Autos & Vehicles",
	10: "Music",
	15: "Pets & Animals",
	17: "Sports",
	18: "Short Movies",
	19: "Travel & Events",
	20: "Gaming",
	21: "Videoblogging",
	22: "People & Blogs",
	23: "Comedy",
	24: "Entertainment",
	25: "News & Politics",
	26: "Howto & Style",
	27: "Education",
	28: "Science & Technology",
	29: "Nonprofits & Activism",
	30: "Movies",
	31: "Anime/Animation",
	32: "Action/Adventure",
	33: "Classics",
	34: "Comedy",
	35: "Documentary",
	36: "Drama",
	37: "Family",
	38: "Foreign",
	39: "Horror",
	40: "Sci-Fi/Fantasy",
	41: "Thriller",
	42: "Shorts",
	43: "Shows",
	44: "Trailers"
}

/* exported VERSION */
var VERSION = chrome.runtime.getManifest().version

var API_KEY = "A%49%7a%61%53y%42O%4f%6e%39%79%2dbx%42%38%4c%48k%2d%35%51%36%4e%44tq%63y9%5f%46%48%6a%35R%484"

var UPDATE_INTERVAL = 1000

var blocksetIds = []

var blocksetDatas = []

var blocksetTimesElapsed = []

var blRegEx = []
var wlRegEx = []
var blYT = []
var wlYT = []

var initDone = false

var currentWeekDay

var generalOptions = {}

function defaultBlockset() {
	return {
		name: "Block set 1",
		requireActive: false,
		annoyMode: false,
		timeAllowed: 600000, // milliseconds
		resetTime: 0, // milliseconds from midnight
		lastReset: (new Date()).getTime(), // millisecods from 1970
		activeDays: [true, true, true, true, true, true, true],
		activeTime: { from: 0, to: 0 }, // milliseconds from midnight
		blacklist: [],
		whitelist: []
	}
}

function defaultTimesElapsed() {
	var res = []
	for (let blocksetId of blocksetIds) {
		res[blocksetId] = 0
	}
	return res
}

const defaultGeneralOptions = {
	clockType: 24,
	displayHelp: true,
	darkTheme: false,
	settingProtection: "never",
	typingTestWordCount: 30
}

var isUpdated = false
var previousVersion = ""

chrome.runtime.onInstalled.addListener(function (details) {
	if (details.reason == "update") {
		isUpdated = true
		previousVersion = details.previousVersion
	}
})


init()

function init() {
	//chrome.storage.local.clear();
	//chrome.storage.sync.clear();

	chrome.storage.sync.get({
		blocksetIds: [0],
		generalOptions: {}
	}, function (items) {
		generalOptions = items.generalOptions
		addAbsentItems(generalOptions, defaultGeneralOptions)

		blocksetIds = items.blocksetIds

		if (blocksetIds.length === 0) {
			initDone = true
		}
		else {
			loadBlocksets()
		}
	})

	setInterval(update, UPDATE_INTERVAL)
	var nextMidnight = new Date().setHours(24, 0, 0, 0) // setHours actually returns ms since epoch
	chrome.alarms.create("midnightUpdate", { when: nextMidnight + 1000, periodInMinutes: 24 * 60 })
	currentWeekDay = new Date().getDay()
}



var saveInNextUpdate = []

/** For some reason, saves done close to startup don't go through, this is to help with that */
function saveBlocksetInNextUpdate(blocksetId) {
	if (!saveInNextUpdate.includes(blocksetId))
		saveInNextUpdate.push(blocksetId)
}

function loadBlocksets() {
	var k = 0

	chrome.storage.sync.get({
		blocksetTimesElapsed: defaultTimesElapsed()
	}, (items) => {
		// Do it this way because historically this has been saved as a object by accident
		for (let index in items.blocksetTimesElapsed) {
			blocksetTimesElapsed[index] = items.blocksetTimesElapsed[index]
		}

		for (let blocksetId of blocksetIds) {
			chrome.storage.sync.get({
				[blocksetId]: {}
			}, (data) => {
				let bsId = Object.keys(data)[0]

				// Strings are always compressed
				if (typeof data[bsId] === "string") {
					blocksetDatas[bsId] = decompress(data[bsId])
				}
				else {
					blocksetDatas[bsId] = data[bsId]
				}


				addAbsentItems(blocksetDatas[bsId], defaultBlockset(bsId))
				generateLookUp(bsId)

				// time elapsed saving changed in 1.1.0
				if (isUpdated && previousVersion.includes("1.0.")) {
					blocksetTimesElapsed[bsId] = blocksetDatas[bsId].timeElapsed
				}

				k++

				if (k === blocksetIds.length) {
					setupTimerReset()
					setupActiveTimeUpdates()
					evaluateAllTabs()

					// eslint-disable-next-line no-unused-vars
					initDone = true
				}
			})
		}

	})

}

/**
 * Add items with default values to this object, if default object has them
 * Always do this before loading anything to account for updates, which add new data to saves
 * @param {Object} object - object to check and modify
 * @param {Object} defaultObject - default
 */
function addAbsentItems(object, defaultObject) {
	var defKeys = Object.keys(defaultObject)
	var keys = Object.keys(object)

	if (keys.length == 0) { // This is for completely new objects
		for (let defKey of defKeys) {
			object[defKey] = defaultObject[defKey]
		}
	}
	else { // This is for backwards compatability
		for (let defKey of defKeys) {
			if (!keys.includes(defKey) || object[defKey] === undefined) {

				if (defKey == "requireActive") { // Set this to true on old saves, in new blocksets it is false
					object[defKey] = true
					continue
				}

				object[defKey] = defaultObject[defKey]
			}
		}
	}
}




/** Listen for updates in settings */
chrome.runtime.onMessage.addListener(function (message, _sender, _sendResponse) {
	let bsId = parseInt(message.id)
	if (message.type === "blocksetChanged") {
		generateLookUp(bsId)
		setupTimerReset(bsId)
		setupActiveTimeUpdates(bsId)
		evaluateAllTabs()
	}
	else if (message.type === "blocksetDeleted") {
		deleteLookUp(bsId)

		// Deletes elapsed timer reset alarm
		chrome.alarms.clear("timerReset_" + bsId)
		chrome.alarms.clear("activeTimeUpdateFrom_" + bsId)
		chrome.alarms.clear("activeTimeUpdateTo_" + bsId)
	}
	else if (message.type === "generalOptionsChanged") {
		// Not really used yet
	}
	else if (message.type === "donate") {
		openDonationPage()
	}
})

chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name.startsWith("timerReset")) {
		resetElapsedTime(parseInt(alarm.name.split("_")[1]))
	}
	else if (alarm.name.startsWith("activeTimeUpdate")) { // both from and to
		activeTimeUpdate()
	}
	else if (alarm.name.startsWith("midnightUpdate")) {
		midnightUpdate()
	}
})


/* Timers to update tabevaluations on user selected reset time. When blocksetId is undefined, setup for all block sets */
function setupTimerReset(blocksetId) {

	let list = []
	if (blocksetId === undefined) { // If undefined, setup for all blocksets
		list = blocksetIds
	}
	else {
		list = [blocksetId]
	}

	for (let bsId of list) {
		// Remove old alarm if it exists
		chrome.alarms.clear("timerReset_" + bsId, _ => {

			const now = new Date()
			let lastPossibleReset = new Date(now.getTime())
			const t = msToTime(blocksetDatas[bsId].resetTime)

			lastPossibleReset.setHours(t.h, t.m, t.s, t.ms)

			// If true, today's reset is coming later today and last possible reset should be yesterday.
			// If false, last possible reset was earlier today and is already correct
			if (lastPossibleReset > now) {
				lastPossibleReset.setTime(lastPossibleReset.getTime() - 86400000)
			}

			if (blocksetDatas[bsId].lastReset < lastPossibleReset.getTime()) {
				resetElapsedTime(bsId)
			}

			chrome.alarms.create("timerReset_" + bsId, { when: lastPossibleReset.getTime() + 86400000, periodInMinutes: 24 * 60 })
		})
	}
}

function setupActiveTimeUpdates(blocksetId) {
	const nowSinceMidnight = timeToMsSinceMidnight(new Date())

	const todayZeroTime = new Date().setHours(0, 0, 0, 0)

	var list
	if (blocksetId === undefined) { // If undefined, setup for all blocksets
		list = blocksetIds
	}
	else {
		list = [blocksetId]
	}

	for (let id_forward of list) {

		(function (id) {
			// Remove old alarm if it exists
			chrome.alarms.clear("activeTimeUpdateFrom_" + id, () => {
				chrome.alarms.clear("activeTimeUpdateTo_" + id, () => {

					const activeTimeFrom = blocksetDatas[id].activeTime.from // MS from midnight
					const activeTimeTo = blocksetDatas[id].activeTime.to // MS from midnight

					if (activeTimeFrom != activeTimeTo) { // If from and to are same, blocksets are just always active, so dont do anything

						if (activeTimeFrom >= nowSinceMidnight) {
							chrome.alarms.create("activeTimeUpdateFrom_" + id,
								{ when: todayZeroTime + activeTimeFrom + 1000, periodInMinutes: 24 * 60 })
						}
						else if (activeTimeFrom < nowSinceMidnight) {
							chrome.alarms.create("activeTimeUpdateFrom_" + id,
								{ when: todayZeroTime + activeTimeFrom + 86400000 + 1000, periodInMinutes: 24 * 60 })
						}

						if (activeTimeTo >= nowSinceMidnight) {
							chrome.alarms.create("activeTimeUpdateTo_" + id,
								{ when: todayZeroTime + activeTimeTo + 1000, periodInMinutes: 24 * 60 })
						}
						else if (activeTimeTo < nowSinceMidnight) {
							chrome.alarms.create("activeTimeUpdateTo_" + id,
								{ when: todayZeroTime + activeTimeTo + 86400000 + 1000, periodInMinutes: 24 * 60 })
						}
					}
				})
			})
		})(id_forward)
	}
}



function msToTime(ms_) {
	let h = Math.floor(ms_ / (1000 * 60 * 60) % 60)
	let m = Math.floor(ms_ / (1000 * 60) % 60)
	let s = Math.floor(ms_ / 1000 % 60)
	let ms = Math.floor(ms_ % 1000)
	return { h, m, s, ms }
}

function msToTimeDisplay(duration) {
	const isNegative = (duration < 0)

	duration = Math.abs(duration)

	var seconds = parseInt((duration / 1000) % 60)
	var minutes = parseInt((duration / (1000 * 60)) % 60)
	var hours = parseInt((duration / (1000 * 60 * 60)) % 24)

	hours = (hours < 10) ? "0" + hours : hours
	minutes = (minutes < 10) ? "0" + minutes : minutes
	seconds = (seconds < 10) ? "0" + seconds : seconds

	return (isNegative ? "-" : "") + hours + ":" + minutes + ":" + seconds
}

function timeToMsSinceMidnight(time) {
	return (time.getSeconds() * 1000) + (time.getMinutes() * 60000) + (time.getHours() * 3600000)
}

function resetElapsedTime(id) {
	blocksetTimesElapsed[id] = 0
	blocksetDatas[id].lastReset = (new Date()).getTime()

	saveElapsedTimes()

	saveBlockset(id)
	saveBlocksetInNextUpdate(id) // resetting can happen close to startup, so use this also
}

/** Updates current weekday. Rechecks all tabs */
function midnightUpdate() {
	currentWeekDay = new Date().getDay()
	evaluateAllTabs()
}

//var activeTimes = {};

/** Just update all tabs because it may not be active time anymore */
function activeTimeUpdate() {
	evaluateAllTabs()
}

function evaluateAllTabs() {
	chrome.tabs.query({}, function (tabs) {
		for (let tab of tabs) {
			evaluateTab(tab)
		}
	})
}

function generateLookUp(blocksetId) {
	deleteLookUp(blocksetId)
	convertToRegEx(blocksetDatas[blocksetId].blacklist, blRegEx[blocksetId], blYT[blocksetId])
	convertToRegEx(blocksetDatas[blocksetId].whitelist, wlRegEx[blocksetId], wlYT[blocksetId])
}

function deleteLookUp(blocksetId) {
	blRegEx[blocksetId] = []
	wlRegEx[blocksetId] = []
	blYT[blocksetId] = { channels: [], categories: [] }
	wlYT[blocksetId] = { channels: [], categories: [] }
}

function convertToRegEx(fromList, toList, extraYT) {
	for (let i = 0; i < fromList.length; i++) {
		let type = fromList[i].type
		if (type === "urlContains") {
			toList.push(new RegExp(escapeRegExp(fromList[i].value)))
		}
		else if (type === "urlEquals") {
			toList.push(new RegExp("^" + escapeRegExp(fromList[i].value) + "$"))
		}
		else if (type === "urlPrefix") {
			toList.push(new RegExp("^" + escapeRegExp(fromList[i].value)))
		}
		else if (type === "urlSuffix") {
			toList.push(new RegExp(escapeRegExp(fromList[i].value) + "$"))
		}
		else if (type === "urlRegexp") {
			toList.push(new RegExp(fromList[i].value))
		}
		else if (type === "ytChannel") {
			extraYT.channels.push(fromList[i].value)
		}
		else if (type === "ytCategory") {
			extraYT.categories.push(fromList[i].value.id)
		}
		else {
			console.warn("Unknown blockset match type: " + type)
		}
	}
}

function escapeRegExp(string) {
	return string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&") // $& means the whole matched string
}

var saveTimer = 0
var callbacks = {
	options: _ => {},
	popup: _ => {}
}

/** Returns true if the tab is the currently active tab in any window and not minimized */
function areTabsOpen(tabIds) {

	for (let windowId in openTabIds) {
		if (tabIds.includes(openTabIds[windowId]) && !minimizedWindowIds.includes(parseInt(windowId))) {
			return true
		}
	}
	return false
}

function update() {

	//var t0 = performance.now()

	var tabsToBlock = new Set()
	var tabsToAnnoy = new Set()
	var lowestTimer = Infinity
	var globalAnnoy = false


	// blocksetAffectedTabs contains block set ids as keys and lists of tab ids that they are affecting.
	// We need to check each tab if they need to be blocked or if we have to display annoy banner in them.
	for (let bsId in blocksetAffectedTabs) {
		bsId = parseInt(bsId)
		if (blocksetAffectedTabs[bsId].length == 0 || !blocksetIds.includes(bsId)) {
			delete blocksetAffectedTabs[bsId]
			continue
		}

		// If requireActive is false for a given block set, we don't need to check if they are active 
		if (!blocksetDatas[bsId].requireActive || areTabsOpen(blocksetAffectedTabs[bsId])) {

			let curTimer = blocksetDatas[bsId].timeAllowed - blocksetTimesElapsed[bsId]

			if (curTimer <= 0) {
				if (blocksetDatas[bsId].annoyMode) {
					if (blocksetDatas[bsId].requireActive) {
						blocksetAffectedTabs[bsId].forEach(tabId => tabsToAnnoy.add(tabId))
					}
					else {
						globalAnnoy = true
					}
					blocksetTimesElapsed[bsId] += UPDATE_INTERVAL
				}
				else {
					blocksetAffectedTabs[bsId].forEach(tabId => tabsToBlock.add(tabId))
				}
			}
			else {
				blocksetTimesElapsed[bsId] += UPDATE_INTERVAL
			}


			lowestTimer = Math.min(lowestTimer, curTimer)
		}
	}

	setBadge(lowestTimer)

	if (globalAnnoy) {
		for (let windowId in openTabIds) {
			annoy(openTabIds[windowId], lowestTimer)
		}
	}
	else {
		for (let tabId of tabsToAnnoy) {
			annoy(tabId, lowestTimer)
		}
	}

	for (let tabId of tabsToBlock) {
		block(tabId)
	}

	// console.log("minimizedWindows: " + minimizedWindowIds)
	// console.log("windows: " + windowIds)

	saveTimer += UPDATE_INTERVAL

	if (saveTimer >= 10000) { // save every 10 seconds
		saveTimer = 0
		saveElapsedTimes()

		for (let bsId of saveInNextUpdate) {
			saveBlockset(bsId)
		}
		saveInNextUpdate = []
	}

	// Update popup and options page if they have registered their callbacks
	callbacks.options()
	callbacks.popup()

	// var t1 = performance.now()
	// console.log("Update took " + (t1 - t0) + " milliseconds.")
}


// Tab and window listeners
var windowIds = []

var minimizedWindowIds = []

/** windowId as key, tabid as value */
var openTabIds = {}

/** Blockset ID as key, list of tabIds as value */
var blocksetAffectedTabs = {}

// chrome.tabs.onCreated.addListener(function (tab) {
// });

chrome.tabs.onRemoved.addListener(function (tabId, _removeInfo) {
	for (let bsId in blocksetAffectedTabs) {
		let index = blocksetAffectedTabs[bsId].indexOf(tabId)
		if (index != -1) {
			blocksetAffectedTabs[bsId].splice(index, 1)
		}
	}
})

chrome.tabs.onActivated.addListener(function (activeInfo) {
	if (!windowIds.includes(activeInfo.windowId)) {
		windowIds.push(activeInfo.windowId)
		openTabIds[activeInfo.windowId] = []
	}

	openTabIds[activeInfo.windowId] = activeInfo.tabId

	setBadge(getLowestTimer())
})


chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	if (changeInfo.status === "complete") {
		evaluateTab(tab)
	}
})

chrome.windows.onRemoved.addListener(function (windowId) {
	var index = windowIds.indexOf(windowId)
	if (index != -1) {
		windowIds.splice(index, 1)
	}
	index = minimizedWindowIds.indexOf(windowId)
	if (index != -1) {
		minimizedWindowIds.splice(index, 1)
	}

	delete openTabIds[windowId]
})

chrome.windows.onFocusChanged.addListener(function (_windowId) {
	chrome.windows.getAll(function (windowArray) {
		minimizedWindowIds = []
		windowIds = []
		for (let window of windowArray) {
			if (window.state === "minimized") {
				minimizedWindowIds.push(window.id)
			}
			else {
				windowIds.push(window.id)
			}
		}
	})
})


/** Adds or removes the tab from 'blocksetAffectedTabs' based on url */
function evaluateTab(tab) {
	blockedBy(tab, function (blocksetIdList) {

		// Remove from old blocksetAffectedTabs
		for (let bsId in blocksetAffectedTabs) {
			let index = blocksetAffectedTabs[bsId].indexOf(tab.id)
			if (index != -1) {
				blocksetAffectedTabs[bsId].splice(index, 1)
			}
		}

		// Add to new blocksetAffectedTabs
		for (let bsId of blocksetIdList) {
			if (blocksetAffectedTabs[bsId] == undefined) {
				blocksetAffectedTabs[bsId] = []
			}
			if (!blocksetAffectedTabs[bsId].includes(tab.id)) {
				blocksetAffectedTabs[bsId].push(tab.id)
			}
		}

		chrome.tabs.get(tab.id, function (t) {
			if (t.active === true) {
				if (!windowIds.includes(t.windowId)) {
					windowIds.push(t.windowId)
					openTabIds[t.windowId] = []
				}
				openTabIds[t.windowId] = t.id
			}
		})
	})
}

var orange = [215, 134, 29, 255]
var red = [215, 41, 29, 255]
var grey = [123, 123, 123, 255]

function setBadge(lowestTimer) {

	var color
	var text = " "
	if (lowestTimer == Infinity) {
		text = ""
	}
	else if (lowestTimer > 1000 * 60 * 60) { // time is more than one hour -> don't display time
		color = grey
	}
	else if (lowestTimer > 1000 * 60) { // time is more than one minute -> display time in minutes
		color = orange
		text = (Math.floor(lowestTimer / (1000 * 60))).toString()
	}
	else if (lowestTimer >= 0) { // time is positive -> display time left in seconds
		color = red
		text = (Math.floor(lowestTimer / 1000)).toString()
	}
	else if (lowestTimer < 0) { // annoy-mode is on
		color = red
		text = "!!"
	}

	chrome.browserAction.setBadgeText({ text: text })

	if (text != "") {
		chrome.browserAction.setBadgeBackgroundColor({ color: color })
	}
}

function getLowestTimer() {
	let lowestTimer = Infinity
	for (let bsId in blocksetAffectedTabs) {
		if (!blocksetDatas[bsId].requireActive ||
            blocksetAffectedTabs[bsId].some(tabId => Object.values(openTabIds).includes(tabId))) {

			lowestTimer = Math.min(lowestTimer, blocksetDatas[bsId].timeAllowed - blocksetTimesElapsed[bsId])
		}
	}
	return lowestTimer
}

function areYTListsEmpty() {
	for (let id of blocksetIds) {
		if (blYT[id].channels.length != 0 || blYT[id].categories.length != 0 || wlYT[id].channels.length != 0 || wlYT[id].categories.length != 0) {
			return false
		}
	}
	return true
}

function getStringBetween(source, a, b) {
	var iA = source.indexOf(a)
	if (iA === -1)
		return source

	var iB = source.indexOf(b, iA)
	if (iB === -1)
		iB = source.length

	return source.substring(iA + a.length, iB)
}


const YT_BASE_URL_LEN = "www.youtube.com/".length

function blockedBy(tab, callback) {

	var blocksetIdList = []

	var url = tab.url.replace(/(^\w+:|^)\/\//, "") //remove protocol

	if (url.endsWith("dawdle-block-enough-page.html")) {
		callback([])
		return
	}

	var now = timeToMsSinceMidnight(new Date())

	for (let id of blocksetIds) {
		if (!blocksetDatas[id].activeDays[currentWeekDay] || !isInActiveTime(now, id)) // if today is not an active day | or not in active hours
			continue

		if (!wlRegEx[id].some((regEx) => regEx.test(url) === true)) { // if not in whitelist
			if (blRegEx[id].some((regEx) => regEx.test(url) === true)) { // if is in blacklist
				blocksetIdList.push(id)
			}
		}
	}

	if (!areYTListsEmpty() && url.startsWith("www.youtube.com/")) {
		if (url.startsWith("watch?", YT_BASE_URL_LEN)) {
			let videoId = getStringBetween(url, "v=", "&")

			httpGetAsync("https://www.googleapis.com/youtube/v3/videos?part=snippet&id=" + videoId + "&fields=items(snippet(categoryId%2CchannelId))&key=" + API_KEY, function (response) {

				if (response.error != undefined) {
					console.error(`Could not check video with id ${videoId}, error: ${response.error}`)
					callback(blocksetIdList)
					return
				}

				let object = JSON.parse(response.message)

				if (object.items.length != 0) {
					let channelId = object.items[0].snippet.channelId
					let categoryId = object.items[0].snippet.categoryId

					evalChannelId(channelId, blocksetIdList, categoryId)
				}

				callback(blocksetIdList)
			})
		}
		else if (url.startsWith("channel/", YT_BASE_URL_LEN)) {
			let list = url.split("/")
			let channelId = list[2]

			evalChannelId(channelId, blocksetIdList)

			callback(blocksetIdList)
		}
		else if (url.startsWith("user/", YT_BASE_URL_LEN)) {
			let list = url.split("/")
			let userName = list[2]

			httpGetAsync("https://www.googleapis.com/youtube/v3/channels?part=snippet&forUsername=" + userName + "&fields=items%2Fid&key=" + API_KEY, function (response) {

				if (response.error != undefined) {
					console.error(`Could not check channel with username ${userName}, error: ${response.error}`)
					callback(blocksetIdList)
					return
				}
				let object = JSON.parse(response.message)

				if (object.items.length != 0) {
					let channelId = object.items[0].id
					evalChannelId(channelId, blocksetIdList)
				}

				callback(blocksetIdList)
			})
		}
		else if (url.startsWith("playlist?", YT_BASE_URL_LEN)) {
			// If url contains "playnext=1", then the url is just used for forwarding, 
			// so wait for the real url to show up.
			// Usually happens when playlist has shuffle on and yt finds next video to play.
			if (url.includes("playnext=1")) {
				callback([]) // Return empty cause we want to block nothing so far
				return
			}

			let playlistId = getStringBetween(url, "list=", "&")

			httpGetAsync("https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=" + playlistId + "&fields=items%2Fsnippet%2FchannelId&key=" + API_KEY, function (response) {
				if (response.error != undefined) {
					console.error(`Could not check playlist with id ${playlistId}, error: ${response.error}`)
					callback(blocksetIdList)
					return
				}
				let object = JSON.parse(response.message)
				if (object.items.length != 0) {
					let channelId = object.items[0].snippet.channelId
					evalChannelId(channelId, blocksetIdList)
				}
				callback(blocksetIdList)
			})
		}
		else { // We have async functions that call callback, so have to do multiple else blocks that just call callback
			callback(blocksetIdList)
		}
	}
	else {
		callback(blocksetIdList)
	}
}

/** Evaluate which block sets want to block this channel combined with possible category */
function evalChannelId(channelId, blocksetIdList, categoryId = undefined) {
	var now = timeToMsSinceMidnight(new Date())
	for (let id of blocksetIds) {
		if (!blocksetDatas[id].activeDays[currentWeekDay] || !isInActiveTime(now, id)) // if today is not an active day | or not in active hours
			continue

		if (categoryId != undefined) {
			if (!wlYT[id].categories.includes(categoryId) && !wlYT[id].channels.some(c => c.id === channelId)) {
				if (blYT[id].categories.includes(categoryId) || blYT[id].channels.some(c => c.id === channelId)) {
					if (!blocksetIdList.includes(id)) {
						blocksetIdList.push(id)
					}
				}
			}
			else {
				let index = blocksetIdList.indexOf(id)
				if (index != -1) {
					blocksetIdList.splice(index, 1)
				}
			}
		}
		else {
			if (!wlYT[id].channels.some(c => c.id === channelId)) {
				if (blYT[id].channels.some(c => c.id === channelId)) {
					if (!blocksetIdList.includes(id)) {
						blocksetIdList.push(id)
					}
				}
			}
			else {
				let index = blocksetIdList.indexOf(id)
				if (index != -1) {
					blocksetIdList.splice(index, 1)
				}
			}
		}

	}
}

function isInActiveTime(timeNow, blocksetId) {
	var from = blocksetDatas[blocksetId].activeTime.from
	var to = blocksetDatas[blocksetId].activeTime.to

	if (from === to) {
		return true
	}
	else if (from < to) {
		return (timeNow > from && timeNow < to)
	}
	else if (from > to) {
		return (timeNow > from || timeNow < to)
	}
}

function block(tabId) {
	chrome.tabs.update(tabId, {
		url: "dawdle-block-enough-page.html"
	})
}

function annoy(tabId, lowestTimer) {
	
	chrome.tabs.executeScript(tabId, {
		code: "typeof dawdle_block_annoy != 'undefined'" // returns true if exists, false if not
	}, results => {
		// This happens on chrome:// urls, because extensions cannot access them
		if (chrome.runtime.lastError) {
			return
		}

		if (results[0]) {
			chrome.tabs.executeScript(tabId, { code: `dawdle_block_annoy.showTime("${msToTimeDisplay(-lowestTimer)}");` })
		}
		else {
			chrome.tabs.executeScript(tabId, {
				file: "js/annoyInjection.js"
			}, () => {
				chrome.tabs.insertCSS(tabId, { file: "styles/annoy.css" })
				chrome.tabs.executeScript(tabId, { code: `dawdle_block_annoy.showTime("${msToTimeDisplay(-lowestTimer)}");` })
			})
		}
	})
}

/* exported bsItem */
/** janky solution to firefox dead object syndrome */
function bsItem(type, value) {
	var item
	if (type.startsWith("yt") == false) {
		item = {
			"type": type,
			"value": value
		}
	}
	else {
		item = {
			"type": type,
			"value": {
				"name": value[0],
				"id": value[1]
			}
		}
	}
	return item
}

/**
 * Converts uint8 array to base64 string
 * @param {Uint8Array} array
 * @returns {string} base 64 array
 */
function toBase64(array) {
	return btoa(String.fromCharCode.apply(null, array))
}

/**
 * Converts base64 string to uint8 array
 * @param {string} base64str 64 array
 * @returns {Uint8Array} array
 */
function fromBase64(base64str) {
	return new Uint8Array(atob(base64str).split("").map(c => c.charCodeAt(0)))
}

/**
 * compress js object and convert to base64 string for easy json storage
 * @param {Object} object
 * @returns {string} base64 string
 */
function compress(object) {
	return toBase64(fflate.compressSync(fflate.strToU8(JSON.stringify(object))))
}

/**
 * decompress base64 encoded string and return the object it stores
 * @param {string} base64str 
 * @returns {Object} object
 */
function decompress(base64str) {
	return JSON.parse(fflate.strFromU8(fflate.decompressSync(fromBase64(base64str))))
}

/**
 * @callback saveCallback
 * @param {string} errorMsg empty if no error
 */

/**
 * 
 * @param {number} blocksetId 
 * @param {saveCallback} callback
 */
function saveBlockset(blocksetId, callback = _ => { }) {

	const compressed = compress(blocksetDatas[blocksetId])

	if (compressed + 20 > chrome.storage.sync.QUOTA_BYTES_PER_ITEM) {
		callback("QUOTA_BYTES_PER_ITEM")
		return
	}

	chrome.storage.sync.set({
		[blocksetId]: compressed
	}, () => {
		if (chrome.runtime.lastError) {
			console.log("Could not save blockset with id: " + blocksetId)
			console.log(chrome.runtime.lastError.message)
			callback(chrome.runtime.lastError.message)
			return
		}

		callback(undefined)
	})
}

/* exported saveAllBlocksets */
function saveAllBlocksets() {
	var saveItems = {}
	for (let id of blocksetIds) {
		saveItems[id] = compress(blocksetDatas[id])
	}
	chrome.storage.sync.set(saveItems, () => {
		if (chrome.runtime.lastError != null) {
			console.log("Could not save all blocksets")
			console.log(chrome.runtime.lastError)
		}
	})
}

function saveElapsedTimes() {
	chrome.storage.sync.set({
		blocksetTimesElapsed: blocksetTimesElapsed
	}, () => {
		if (chrome.runtime.lastError != null) {
			console.log("Could not save elapsed times")
			console.log(chrome.runtime.lastError)
		}
	})
}


function httpGetAsync(theUrl, callback) {
	var xmlHttp = new XMLHttpRequest()
	xmlHttp.timeout = 1500
	xmlHttp.ontimeout = function (_e) {
		callback({ error: "timed out" })
	}
	xmlHttp.onreadystatechange = function () {
		if (xmlHttp.readyState == 4) {
			if (xmlHttp.status == 200) {
				callback({ message: xmlHttp.responseText })
			}
			else if (xmlHttp.status == 400) {
				callback({ error: "bad request" })
			}
		}
	}
	xmlHttp.open("GET", theUrl, true)
	xmlHttp.send(null)
}

function openDonationPage() {
	chrome.tabs.create({ url: "https://paypal.me/eerolehtinen" }, function (_tab) { })
}
