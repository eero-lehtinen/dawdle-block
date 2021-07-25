import fetch from "cross-fetch"
import { err, errAsync, ok, okAsync, ResultAsync } from "neverthrow"

const APIKey = 
	"A%49%7a%61%53y%42O%4f%6e%39%79%2dbx%42%38%4c%48k%2d%35%51%36%4e%44tq%63y9%5f%46%48%6a%35R%484"

const APIBaseUrl = "https://youtube.googleapis.com/youtube/v3"

const ytUrl = "www.youtube.com"

export interface YTInfo {
	channelId: string | null
	channelTitle: string | null
	categoryId: string | null
}

type YTChannelInfo = Omit<YTInfo, "categoryId">

/** Returns a copy of YTInfo with all values set to null */
export const nullYTInfo = (): YTInfo => {
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
 * Fetch YTInfo associated with it from YouTube data API if url is a 
 * page of YouTube channel, video or playlist.
 * Returns null for categoryId if it can't be determined (e.g. playlist doesn't have a category)
 * Returns null for all if web request fails.
 * @param url url find info about
 * @returns fetched youtube information
 */
export const getYTInfo = async(url: URL): Promise<YTInfo> => {
	if (url.hostname !== ytUrl) {
		return nullYTInfo()
	}

	const get = (): FetchRes<YTInfo> => {
		const videoId = findVideoId(url)
		if (videoId !== null) {
			return fetchVideoInfo(videoId)
		}

		const channelId = findChannelId(url)
		if (channelId !== null) {
			return fetchChannelTitle(channelId)
				.map(title => ({ ...nullYTInfo(), channelId, channelTitle: title }))
		}

		const channelUsername = findChannelUsername(url)
		if (channelUsername !== null) {
			return fetchUsernameChannelInfo(channelUsername)
				.map(channelInfo => ({ ...nullYTInfo(), ...channelInfo }))
		}

		const playlistId = findPlaylistId(url)
		if (playlistId !== null && url.searchParams.get("playnext") !== "1") {
			return fetchPlaylistChannelInfo(playlistId)
				.map(channelInfo => ({ ...nullYTInfo(), ...channelInfo }))
		}

		return okAsync(nullYTInfo())
	}
	
	const res = await get()
	return res.unwrapOr(nullYTInfo())
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



/* eslint-disable jsdoc/require-jsdoc */
export class FetchError extends Error {}
export class BadStatusCodeFetchError extends FetchError {}
export class EmptyResponseFetchError extends FetchError {}
export class NetworkFetchError extends FetchError {}
/* eslint-enable jsdoc/require-jsdoc */

export type FetchRes<T> = ResultAsync<T, FetchError>

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Returns the first item of YouTube data API request response. */
const getItemFromResponse = 
(response: Response): FetchRes<any> =>  {
	if (response.status !== 200)
		return errAsync(new BadStatusCodeFetchError())

	return ResultAsync.fromSafePromise<any, FetchError>(response.json())
		.andThen(body =>
			(body.items === undefined || body.items.length === 0) ? 
				err(new EmptyResponseFetchError()) :
				ok(body.items[0]))
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Fetch with error handling */
const safeFetch = (url: string) =>
	ResultAsync.fromPromise<Response, FetchError>(fetch(url), () => new NetworkFetchError())


/** Fetches video info from YouTube API with this id. */
const fetchVideoInfo = (videoId: string): FetchRes<YTInfo> =>
	safeFetch(
		`${APIBaseUrl}/videos?part=snippet` +
			`&id=${videoId}` + 
			"&field=items/snippet(categoryId,channelId,channelTitle)" +
			`&key=${APIKey}`)
		.andThen(getItemFromResponse)
		.map(item => ({
			channelId: item.snippet.channelId, 
			channelTitle: item.snippet.channelTitle,
			categoryId: item.snippet.categoryId,
		}))

/** Fetches channel id and title of the author of this playlist. */
const fetchPlaylistChannelInfo = (playlistId: string): FetchRes<YTChannelInfo> =>
	safeFetch(
		`${APIBaseUrl}/playlists?part=snippet` +
			`&id=${playlistId}` + 
			"&field=items/snippet(channelId,channelTitle)" +
			`&key=${APIKey}`)
		.andThen(getItemFromResponse)
		.map(item => ({
			channelId: item.snippet.channelId, 
			channelTitle: item.snippet.channelTitle, 
		}))

/** Fetches channel id and title associated with this username. */
const fetchUsernameChannelInfo = (username: string): FetchRes<YTChannelInfo> =>
	safeFetch(
		`${APIBaseUrl}/channels?part=snippet` +
			`&forUsername=${username}` +
			"&field=items(id,snippet(title))" +
			`&key=${APIKey}`)
		.andThen(getItemFromResponse)
		.map(item => ({
			channelId: item.id, 
			channelTitle: item.snippet.title, 
		}))

/** Fetches channel title associated with this channel id. */
export const fetchChannelTitle = (channelId: string): FetchRes<string> =>
	safeFetch(
		`${APIBaseUrl}/channels?part=snippet` +
			`&id=${channelId}` +
			"&field=items/snippet(title)" +
			`&key=${APIKey}`)
		.andThen(getItemFromResponse)
		.map(item => item.snippet.title)