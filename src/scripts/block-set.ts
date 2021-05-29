import { plainToClass } from "class-transformer"

export interface BlockRuleYt {
	type: "ytChannel" | "ytCategory"
	value: {
		name: string,
		id: string
	}
}

export interface BlockRuleUrl {
	type: "urlEquals" | "urlContains" | "urlPrefix" | "urlSuffix" | "urlRegexp"
	value: string
}

export type BlockRule = BlockRuleUrl | BlockRuleYt

interface ActiveTime { from: number, to: number }

const currentBlockSetVersion = 1

export class BlockSet {
	readonly v = currentBlockSetVersion
	name = "Block set 1"
	requireActive = false
	annoyMode = false
	timeAllowed = 600000 // milliseconds
	resetTime = 0 // milliseconds from midnight
	lastReset = 0 // millisecods from 1970
	activeDays: boolean[] = new Array(7).fill(true);
	activeTime: ActiveTime = { from: 0, to: 0 }// milliseconds from midnight
	blacklist: BlockRule[] = []
	whitelist: BlockRule[] = []
}

export const plainToBlockSet = (obj: unknown): BlockSet => {

	// Handle different versions of save data here if needed

	return plainToClass(BlockSet, obj)
}