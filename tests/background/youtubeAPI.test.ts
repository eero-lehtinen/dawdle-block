import { mocked } from "ts-jest/utils"
import fetch from "cross-fetch"
import { getYTInfo } from "@src/background/youtubeAPI"

jest.mock("cross-fetch")

const mockedFetch = mocked(fetch, true)

/** Returns latest function parameters of globally mocked fetch function. */
const getLatestFetchParams = () => mockedFetch.mock.calls[mockedFetch.mock.calls.length - 1]

const nullYTInfo = { channelId: null, channelTitle: null, categoryId: null }

describe("test YouTube API error states", () => {
	test("returns null values when YouTube isn't in the beginning of the url", async () => {
		await expect(getYTInfo(new URL("file:///asd"))).resolves.toStrictEqual(nullYTInfo)
		await expect(getYTInfo(new URL("https://asdwww.youtube.com"))).resolves.toStrictEqual(
			nullYTInfo
		)
	})

	test("returns null values when YouTube is not on channel, playlist or video page", async () => {
		await expect(
			getYTInfo(new URL("https://www.youtube.com/feed/subscriptions"))
		).resolves.toStrictEqual(nullYTInfo)
	})

	test("returns null values when YouTube is on a valid page but id can't be located in url", async () => {
		// No "v=" included, which we use to locate the id
		await expect(
			getYTInfo(new URL("https://www.youtube.com/watch?asd&t=42"))
		).resolves.toStrictEqual(nullYTInfo)
	})

	test("return null values when channel with this id isn't found", async () => {
		mockedFetch.mockResolvedValueOnce({
			status: 200,
			json: () => Promise.resolve({}),
		} as Response)

		await expect(
			getYTInfo(new URL("https://www.youtube.com/watch?v=asd"))
		).resolves.toStrictEqual(nullYTInfo)
	})

	test("return null values when request status is not 200", async () => {
		mockedFetch.mockResolvedValueOnce({
			status: 404,
		} as Response)

		await expect(
			getYTInfo(new URL("https://www.youtube.com/watch?v=asd"))
		).resolves.toStrictEqual(nullYTInfo)
	})
})

describe("test YouTube API blocking info for video urls", () => {
	test("returns correct results with a valid id", async () => {
		mockedFetch.mockResolvedValueOnce({
			status: 200,
			json: () =>
				Promise.resolve({
					items: [{ snippet: { channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw", categoryId: "22" } }],
				}),
		} as Response)

		const res = await getYTInfo(new URL("https://www.youtube.com/watch?v=ylLzyHk54Z0&t=42"))
		expect(getLatestFetchParams()?.[0]).toContain("videos")
		expect(getLatestFetchParams()?.[0]).toContain("part=snippet")
		expect(getLatestFetchParams()?.[0]).toContain("id=ylLzyHk54Z0")
		expect(res.channelId).toStrictEqual("UC_x5XG1OV2P6uZZ5FSM9Ttw")
		expect(res.categoryId).toStrictEqual("22")
	})
})

describe("test YouTube API blocking info for channel urls", () => {
	test("returns correct results with a valid id", async () => {
		mockedFetch.mockResolvedValueOnce({
			status: 200,
			json: () => Promise.resolve({ items: [{ snippet: { title: "Google Developers" } }] }),
		} as Response)

		const res = await getYTInfo(
			new URL("https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw")
		)
		expect(res).toStrictEqual({
			...nullYTInfo,
			channelTitle: "Google Developers",
			channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
		})
	})

	const expectUsername = async (url: URL) => {
		mockedFetch.mockResolvedValueOnce({
			status: 200,
			json: () =>
				Promise.resolve({
					items: [
						{
							id: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
							snippet: { title: "Google Developers" },
						},
					],
				}),
		} as Response)

		const res = await getYTInfo(url)

		expect(getLatestFetchParams()?.[0]).toContain("channels")
		expect(getLatestFetchParams()?.[0]).toContain("part=snippet")
		expect(getLatestFetchParams()?.[0]).toContain("forUsername=google")
		expect(res).toStrictEqual({
			...nullYTInfo,
			channelTitle: "Google Developers",
			channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
		})
	}

	test("returns correct results with a valid username", async () => {
		await expectUsername(new URL("https://www.youtube.com/c/google"))
	})

	test("returns correct results with a valid legacy username", async () => {
		await expectUsername(new URL("https://www.youtube.com/user/google"))
	})

	test("returns correct results with a username isn't last part of URL", async () => {
		await expectUsername(new URL("https://www.youtube.com/c/google/videos"))
	})
})

describe("test YouTube API blocking info for playlist urls", () => {
	test("returns correct results with a valid id", async () => {
		mockedFetch.mockResolvedValueOnce({
			status: 200,
			json: () =>
				Promise.resolve({
					items: [
						{
							snippet: {
								channelTitle: "Google Developers",
								channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
							},
						},
					],
				}),
		} as Response)

		const res = await getYTInfo(
			new URL("https://www.youtube.com/playlist?list=PLOU2XLYxmsIJs-bCAsrT21mTgen_DklG1")
		)

		expect(getLatestFetchParams()?.[0]).toContain("playlists")
		expect(getLatestFetchParams()?.[0]).toContain("part=snippet")
		expect(getLatestFetchParams()?.[0]).toContain("id=PLOU2XLYxmsIJs-bCAsrT21mTgen_DklG1")
		expect(res).toStrictEqual({
			...nullYTInfo,
			channelTitle: "Google Developers",
			channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
		})
	})

	test("returns empty results when url contains parameter 'playnext=1'", async () => {
		const res = await getYTInfo(new URL("https://www.youtube.com/playlist?list=asd&playnext=1"))
		expect(res).toStrictEqual(nullYTInfo)
	})
})
