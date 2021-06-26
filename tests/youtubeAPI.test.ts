import { mocked } from "ts-jest/utils"
import fetch from "cross-fetch"
import { getYtInfo } from "../src/background/youtubeAPI"

jest.mock("cross-fetch")

const mockedFetch = mocked(fetch, true)

const getLatestFetchParams = () => mockedFetch.mock.calls[mockedFetch.mock.calls.length - 1]

const nullYTInfo = { channelId: null, channelTitle: null, categoryId: null }

describe("test YouTube API error states", () => {

	it("returns null values when YouTube isn't in the beginning of the url", async() => {
		await expect(getYtInfo("asd")).resolves.toStrictEqual(nullYTInfo)
		await expect(getYtInfo("asdwww.youtube.com")).resolves.toStrictEqual(nullYTInfo)
	})

	it("returns null values when YouTube is not on channel, playlist or video page", async() => {
		await expect(getYtInfo("www.youtube.com/feed/subscriptions")).resolves.toStrictEqual(nullYTInfo)
	})

	it("returns null values when YouTube is on a " +
		"valid page but id can't be located in url", async() => {
		// No "v=" included, which we use to locate the id
		await expect(getYtInfo("www.youtube.com/watch?asdfasdf&t=42"))
			.resolves.toStrictEqual(nullYTInfo)
	})

	it("return null values and logs error when channel with this id isn't found", async() => {
		const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {/* do nothing */})
		mockedFetch.mockResolvedValueOnce({
			status: 200, 
			json: async() => {return {}},	
		} as Response)

		await expect(getYtInfo("www.youtube.com/watch?v=asd")).resolves.toStrictEqual(nullYTInfo)
		expect(warnSpy).toHaveBeenLastCalledWith("Response is empty")
	})

	it("return null values and logs error when request status is not 200", async() => {
		const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {/* do nothing */})
		mockedFetch.mockResolvedValueOnce({
			status: 404, 
		} as Response)
		
		await expect(getYtInfo("www.youtube.com/watch?v=asd")).resolves.toStrictEqual(nullYTInfo)
		expect(warnSpy).toHaveBeenLastCalledWith("Request failed")
	})
})

describe("test YouTube API blocking info for video urls", () => {
	it("returns correct results with a valid id", async() => {
		mockedFetch.mockResolvedValueOnce({
			status: 200, 
			json: async() => {
				return { items: [{ snippet: { channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw", categoryId: "22" } }] }
			}, 
		} as Response)
		
		const res = await getYtInfo("www.youtube.com/watch?v=ylLzyHk54Z0&t=42")
		expect(getLatestFetchParams()?.[0]).toContain("videos")
		expect(getLatestFetchParams()?.[0]).toContain("part=snippet")
		expect(getLatestFetchParams()?.[0]).toContain("id=ylLzyHk54Z0")
		expect(res.channelId).toStrictEqual("UC_x5XG1OV2P6uZZ5FSM9Ttw")
		expect(res.categoryId).toStrictEqual("22")
	})
})



describe("test YouTube API blocking info for channel urls", () => {
	it("returns correct results with a valid id", async() => {
		mockedFetch.mockResolvedValueOnce({
			status: 200, 
			json: async() => {
				return { items: [{ snippet: { title: "Google Developers" } }] }
			}, 
		} as Response)

		const res = await getYtInfo("www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw")
		expect(res).toStrictEqual({ 
			...nullYTInfo, 
			channelTitle: "Google Developers", 
			channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw", 
		})
	})

	const testUsername = async(url: string) => {
		mockedFetch.mockResolvedValueOnce({
			status: 200, 
			json: async() => {
				return { items: [{ 
					id: "UC_x5XG1OV2P6uZZ5FSM9Ttw", 
					snippet: { title: "Google Developers" } }] }
			}, 
		} as Response)

		const res = await getYtInfo(url)

		expect(getLatestFetchParams()?.[0]).toContain("channels")
		expect(getLatestFetchParams()?.[0]).toContain("part=snippet")
		expect(getLatestFetchParams()?.[0]).toContain("forUsername=google")
		expect(res).toStrictEqual({ ...nullYTInfo,
			channelTitle: "Google Developers", 
			channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw", 
		})
	}

	it("returns correct results with a valid username", async() => {
		await testUsername("www.youtube.com/c/google")
	})

	it("returns correct results with a valid legacy username", async() => {
		await testUsername("www.youtube.com/user/google")
	})
})

describe("test YouTube API blocking info for playlist urls", () => {
	it("returns correct results with a valid id", async() => {
		mockedFetch.mockResolvedValueOnce({
			status: 200, 
			json: async() => {
				return { items: [{ snippet: { 
					channelTitle: "Google Developers",  
					channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw" } }] }
			}, 
		} as Response)

		const res = await getYtInfo("www.youtube.com/playlist?list=PLOU2XLYxmsIJs-bCAsrT21mTgen_DklG1")

		expect(getLatestFetchParams()?.[0]).toContain("playlists")
		expect(getLatestFetchParams()?.[0]).toContain("part=snippet")
		expect(getLatestFetchParams()?.[0]).toContain("id=PLOU2XLYxmsIJs-bCAsrT21mTgen_DklG1")
		expect(res).toStrictEqual({ ...nullYTInfo,
			channelTitle: "Google Developers", 
			channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw", 
		})
	})

	it("returns empty results when url contains 'playnext=1'", async() => {
		const res = await getYtInfo("www.youtube.com/playlist?list=asd&playnext=1")
		expect(res).toStrictEqual(nullYTInfo)
	})
})