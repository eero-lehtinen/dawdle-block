import fetch from "cross-fetch"

const APIKey = 
	"A%49%7a%61%53y%42O%4f%6e%39%79%2dbx%42%38%4c%48k%2d%35%51%36%4e%44tq%63y9%5f%46%48%6a%35R%484"

const APIBaseUrl = "https://youtube.googleapis.com/youtube/v3"

const ytUrl = "www.youtube.com"

interface YTInfo {
	channelId: string | null
	channelTitle: string | null
	categoryId: number | null
}

type YTChannelInfo = Omit<YTInfo, "categoryId">

/** Returns a copy of YTInfo with all values set to null */
const nullYTInfo = (): YTInfo => {
	return {
		channelId: null, 
		channelTitle: null, 
		categoryId: null,
	}
}


/**
 * Returns string between start pos and end delimiter.
 * If end delimeter cannot be found, returns the rest of the source after start pos.
 * @param source input string
 * @param endDelimiter end delimiter string
 * @param startPos index of first character of returned string
 * @returns string between start and end
 */
const getPartBefore = (source: string, 
	endDelimiter: string, startPos: number): string | null =>  {
	const end = source.indexOf(endDelimiter, startPos)
	if (end === -1)
		return source.substring(startPos)
	return source.substring(startPos, end)
}

/**
 * If url is a page of YouTube channel, video or playlist,
 * fetch channelId and categoryId associated with it from YouTube data API.
 * Returns null for categoryId if it can't be determined (e.g. playlist doesn't have a category)
 * Returns null for both if url is not a channel, video or playlist.
 * @param url url find info about
 * @returns fetched youtube information
 */
export const getYtInfo = async(url: URL): Promise<YTInfo> => {
	if (url.hostname !== ytUrl) {
		return nullYTInfo()
	}

	try {
		const videoId = findVideoId(url)
		if (videoId !== null) {
			return await fetchVideoInfo(videoId)
		}

		const channelId = findChannelId(url)
		if (channelId !== null) {
			const channelTitle = await fetchChannelTitle(channelId)
			return { ...nullYTInfo(), channelId, channelTitle }
		}

		const channelUsername = findChannelUsername(url)
		if (channelUsername !== null) {
			const channelInfo = await fetchUsernameChannelInfo(channelUsername)
			return { ...nullYTInfo(), ...channelInfo }
		}

		const playlistId = findPlaylistId(url)
		if (playlistId !== null && url.searchParams.get("playnext") !== "1") {
			const channelInfo = await fetchPlaylistChannelInfo(playlistId)
			return { ...nullYTInfo(), ...channelInfo }
		}
	}
	catch (err) {
		console.warn(err.message)
	}

	return nullYTInfo()
}

/**
 * Tries to find video id from YouTube url if it exists.
 * E.g. finds "asd" from https://www.youtube.com/watch?v=asd&t=10
 * @param url YouTube url
 * @returns video id if it exists, null otherwise
 */
const findVideoId = (url: URL): string | null => {
	if (url.pathname === "/watch") return url.searchParams.get("v")
	return null
}

/**
 * Tries to find channel id from YouTube url if it exists
 * E.g. finds "asd" from https://www.youtube.com/channel/asd/videos
 * @param url YouTube url
 * @returns channel id if it exists, null otherwise
 */
const findChannelId = (url: URL): string | null => {
	if (url.pathname.startsWith("/channel/")) {
		return getPartBefore(url.pathname, "/", "/channel/".length)
	}
	return null
}

/**
 * Tries to find channel username from YouTube url if it exists
 * Supports /c/username and legacy /user/username.
 * E.g. finds "asd" from https://www.youtube.com/c/asd/videos
 * Sometimes usernames are weirdly included in the url (e.g. www.youtube.com/googlecode).
 * These usernames aren't found with this function. They seem to be very rare 
 * (maybe only google themselves has them).
 * @param url YouTube url
 * @returns channel id if it exists, null otherwise
 */
const findChannelUsername = (url: URL): string | null => {
	if (url.pathname.startsWith("/c/")) {
		return getPartBefore(url.pathname,  "/", "/c/".length)
	}
	if (url.pathname.startsWith("/user/")) {
		return getPartBefore(url.pathname, "/", "/user/".length)
	}
	return null
}


/**
 * Tries to find playlist id from YouTube url if it exists
 * E.g. finds "asd" from https://www.youtube.com/playlist?list=asd
 * @param url YouTube url
 * @returns playlist id if it exists, null otherwise
 */
const findPlaylistId = (url: URL): string | null => {
	if (url.pathname === "/playlist") return url.searchParams.get("list")
	return null
}


/**
 * Returns the first item of YouTube data API request response.
 * Throws errors if results show signs of failure (is empty or status not ok).
 * @param response fetch response from YouTube data API
 * @returns first item
 */
const getItemFromResponse = 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async(response: Response): Promise<any> => {
	if (response.status !== 200) {
		throw new Error("Request failed")
	}
	const body = await response.json()
	if (body.items === undefined || body.items.length === 0) {
		throw new Error("Response is empty")
	}

	return body.items[0]
}

/**
 * Fetches channel id of the author of this video and the category id of this video.
 * @param videoId video id found in the url
 * @returns channel id and category id
 */
const fetchVideoInfo = async(videoId: string): Promise<YTInfo> => {
	const response = await fetch(
		`${APIBaseUrl}/videos?part=snippet` +
		`&id=${videoId}` + 
		"&field=items/snippet(categoryId,channelId,channelTitle)" +
		`&key=${APIKey}`,
	)

	const item = await getItemFromResponse(response)
	return {
		channelId: item.snippet.channelId, 
		channelTitle: item.snippet.channelTitle,
		categoryId: item.snippet.categoryId,
	}
}

/**
 * Fetches channel id of the author of this playlist.
 * @param playlistId playlist id found in the url
 * @returns channel id
 */
const fetchPlaylistChannelInfo = async(playlistId: string): Promise<YTChannelInfo> => {
	const response = await fetch(
		`${APIBaseUrl}/playlists?part=snippet` +
		`&id=${playlistId}` + 
		"&field=items/snippet(channelId,channelTitle)" +
		`&key=${APIKey}`,
	)

	const item = await getItemFromResponse(response)
	return { 
		channelId: item.snippet.channelId, 
		channelTitle: item.snippet.channelTitle, 
	} 
}

/**
 * Fetches channel id and title associated with this username,
 * @param username username found in the url
 * @returns channel id and title
 */
const fetchUsernameChannelInfo = async(username: string): Promise<YTChannelInfo> => {
	const response = await fetch(
		`${APIBaseUrl}/channels?part=snippet` +
		`&forUsername=${username}` +
		"&field=items(id,snippet(title))" +
		`&key=${APIKey}`,
	)
	const item = await getItemFromResponse(response)
	return { 
		channelId: item.id, 
		channelTitle: item.snippet.title, 
	}
}

/**
 * Fetches channel title associated with this channel id.
 * @param channelId channel id
 * @returns channel title
 */
export const fetchChannelTitle = async(channelId: string): Promise<string> => {
	const response = await fetch(
		`${APIBaseUrl}/channels?part=snippet` +
		`&id=${channelId}` +
		"&field=items/snippet(title)" +
		`&key=${APIKey}`,
	)
	const item = await getItemFromResponse(response)
	return item.snippet.title
}