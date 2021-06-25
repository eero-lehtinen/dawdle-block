import fetch from "cross-fetch"

const APIKey = 
	"A%49%7a%61%53y%42O%4f%6e%39%79%2dbx%42%38%4c%48k%2d%35%51%36%4e%44tq%63y9%5f%46%48%6a%35R%484"

const APIBaseUrl = "https://youtube.googleapis.com/youtube/v3"

const ytUrl = "www.youtube.com"

interface YtBlockingInfo { 
	channelId: string | null
	categoryId: number | null
}

/**
 * If url is a page of YouTube channel, video or playlist,
 * fetch channelId and categoryId associated with it from YouTube data API.
 * Returns null for categoryId if it can't be determined (e.g. playlist doesn't have a category)
 * Returns null for both if url is not a channel, video or playlist.
 * @param url URL with no protocols (e.g. "https://")
 * @returns blocking results
 */
export const getYtBlockingInfo = async(url: string): Promise<YtBlockingInfo> => {
	if (!url.startsWith(ytUrl)) {
		return { channelId: null, categoryId: null }
	}

	try {
		const videoId = findVideoId(url)
		if (videoId) {
			return await fetchVideoBlockingInfo(videoId)
		}

		const channelId = findChannelId(url)
		if (channelId) {
			return { channelId: channelId, categoryId: null }
		}

		const channelUsername = findChannelUsername(url)
		if (channelUsername) {
			return { channelId: await fetchChannelId(channelUsername), categoryId: null }
		}

		const playlistId = findPlaylistId(url)
		if (playlistId && !url.includes("playnext=1")) {
			return { channelId: await fetchPlaylistChannelId(playlistId), categoryId: null }
		}
	}
	catch (err) {
		console.warn(err.message)
	}

	return { channelId: null, categoryId: null }
}

interface FindBetween {
	start: string
	end: string
}

/**
 * Returns string between first occurrance of start and end.
 * If end cannot be found, returns the rest of the source after start.
 * @param source input string
 * @param findBetween start and end
 * @param startPos start search of start from this index
 * @returns string between start and end
 */
const getPartBetween = (source: string, { start, end }: FindBetween, startPos = 0): string | null =>  {
	const iA = source.indexOf(start, startPos)
	if (iA === -1)
		return null

	let iB = source.indexOf(end, iA + start.length)
	if (iB === -1)
		iB = source.length

	return source.substring(iA + start.length, iB)
}

/**
 * Tests if path is after the www.youtube.com part. 
 * Then tries to find string between start and end.
 * Useful when trying to extract e.g. ids from urls.
 * @param url YouTube url
 * @param path relevant path (e.g. "/watch?")
 * @param findBetween start and end, (e.g. for url parameters "param=" and "&")
 * @returns Identifier found between start and end. Null if identifier can't be found.
 */
const findYtUrlIdentifier = (url: string, path: string, { start, end }: FindBetween) => {
	if (url.startsWith(path, ytUrl.length)) {
		return getPartBetween(url, { start, end }, ytUrl.length)
	}
	return null
}

/**
 * Tries to find video id from YouTube url if it exists.
 * @param url YouTube url
 * @returns video id if it exists, null otherwise
 */
const findVideoId = (url: string): string | null => {
	return findYtUrlIdentifier(url, "/watch?", { start: "v=", end: "&" })
}

/**
 * Tries to find channel id from YouTube url if it exists
 * @param url YouTube url
 * @returns channel id if it exists, null otherwise
 */
const findChannelId = (url: string): string | null => {
	return findYtUrlIdentifier(url, "/channel/", { start: "/channel/", end: "/" })
}

/**
 * Tries to find channel username from YouTube url if it exists
 * Supports /c/username and legacy /user/username.
 * Sometimes usernames are weirdly included in the url (e.g. www.youtube.com/googlecode).
 * These usernames aren't found with this function. They seem to be very rare 
 * (maybe only google themselves has them).
 * @param url YouTube url
 * @returns channel id if it exists, null otherwise
 */
const findChannelUsername = (url: string): string | null => {
	return findYtUrlIdentifier(url, "/c/", { start: "/c/", end: "/" }) || 
		findYtUrlIdentifier(url, "/user/", { start: "/user/", end: "/" })
}


/**
 * Tries to find playlist id from YouTube url if it exists
 * @param url YouTube url
 * @returns playlist id if it exists, null otherwise
 */
const findPlaylistId = (url: string): string | null => {
	return findYtUrlIdentifier(url, "/playlist?", { start: "list=", end: "&" })
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
	if (body.items.length === 0) {
		throw new Error("Response is empty")
	}

	return body.items[0]
}

/**
 * Fetches channel id of the author of this video and the category id of this video.
 * @param videoId video id found in the url
 * @returns channel id and category id
 */
const fetchVideoBlockingInfo = async(videoId: string): Promise<YtBlockingInfo> => {
	const videoInfoField = "items(snippet(categoryId,channelId))"
	const response = await fetch(
		`${APIBaseUrl}/videos?part=snippet` +
		`&id=${videoId}` + 
		`&field=${videoInfoField}` +
		`&key=${APIKey}`,
	)

	const item = await getItemFromResponse(response)

	return {
		channelId: item.snippet.channelId, 
		categoryId: item.snippet.categoryId, 
	}
}

/**
 * Fetches channel id of the author of this playlist.
 * @param playlistId playlist id found in the url
 * @returns channel id
 */
const fetchPlaylistChannelId = async(playlistId: string): Promise<string> => {
	const playlistInfoField = "items/snippet/channelId"
	const response = await fetch(
		`${APIBaseUrl}/playlists?part=snippet` +
		`&id=${playlistId}` + 
		`&field=${playlistInfoField}` +
		`&key=${APIKey}`,
	)

	const item = await getItemFromResponse(response)
	return item.snippet.channelId
}

/**
 * Fetches channel id associated with this username,
 * @param username username found in the url
 * @returns channel id
 */
const fetchChannelId = async(username: string): Promise<string> => {
	const response = await fetch(
		`${APIBaseUrl}/channels?part=id` +
		`&forUsername=${username}` +
		`&key=${APIKey}`,
	)
	const item = await getItemFromResponse(response)
	return item.id
}