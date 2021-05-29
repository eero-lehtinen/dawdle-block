import { plainToClass } from "class-transformer"


export interface BlockRule {
	type: "asd"
}

export class BlockSet {
	readonly v = 1
	name = "Block set 1"
	requireActive = false
	annoyMode = false
	timeAllowed = 600000 // milliseconds
	resetTime = 0 // milliseconds from midnight
	lastReset = 0 // millisecods from 1970
	activeDays: boolean[] = new Array(7).fill(true);
	activeTime = { from: 0, to: 0 } // milliseconds from midnight
	blacklist: BlockRule[] = []
	whitelist: BlockRule[] = []
}

export const plainToBlockSet = (obj: any): BlockSet => {

	// Handle different versions of save data here if needed

	return plainToClass(BlockSet, obj, { excludeExtraneousValues: true })
}