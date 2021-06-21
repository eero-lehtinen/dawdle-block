import fetch from "cross-fetch"

const APIKey = 
	"A%49%7a%61%53y%42O%4f%6e%39%79%2dbx%42%38%4c%48k%2d%35%51%36%4e%44tq%63y9%5f%46%48%6a%35R%484"

const videoInfoField = "items(snippet(categoryId,channelId))"

interface ytVideoInfo { 
	channelId: string
	categoryId: number
}

export const fetchYtVideoInfo = async(videoId: string): Promise<ytVideoInfo> => {
	const response = await fetch(
		"https://youtube.googleapis.com/youtube/v3/videos?part=snippet" +
		`&id=${videoId}` + 
		`&field=${videoInfoField}` +
		`&key=${APIKey}`,
	)

	if (response.status !== 200) {
		throw new Error("Request failed")
	}
	
	const body = await response.json()

	if (body.items.length === 0) {
		throw new Error("Video not found")
	}

	return {
		channelId: body.items[0].snippet.channelId, 
		categoryId: body.items[0].snippet.categoryId, 
	}
}
