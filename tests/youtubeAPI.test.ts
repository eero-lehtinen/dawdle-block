import { mocked } from "ts-jest/utils"
import fetch from "cross-fetch"
import { fetchYtVideoInfo } from "../src/scripts/background/youtubeAPI"

jest.mock("cross-fetch")

const mockedFetch = mocked(fetch, true)

describe("test youtube api fetching", () => {
	it("returns correct results with a valid id", async() => {
		mockedFetch.mockResolvedValue({
			status: 200, 
			json: async() => {
				return { items: [{ snippet: { channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw", categoryId: "22" } }] }
			}, 
		} as Response)
		
		const res = await fetchYtVideoInfo("ylLzyHk54Z0")
		expect(res.channelId).toStrictEqual("UC_x5XG1OV2P6uZZ5FSM9Ttw")
		expect(res.categoryId).toStrictEqual("22")
	})

	it("throws 'Video not found' error when id is invalid", async() => {
		mockedFetch.mockResolvedValue({
			status: 200, 
			json: async() => {return { items: [] }},	
		} as Response)

		await expect(fetchYtVideoInfo("")).rejects.toThrowError("Video not found")
	})

	it("throws 'Request failed' error when request status is not 200", async() => {
		mockedFetch.mockResolvedValue({
			status: 404, 
		} as Response)
		
		await expect(fetchYtVideoInfo("asd")).rejects.toThrowError("Request failed")
	})
})