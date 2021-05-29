import { BlockSet, plainToBlockSet } from "../src/scripts/block-set"

test("Empty js object becomes default BlockSet", () => {
	expect(plainToBlockSet({})).toStrictEqual(new BlockSet())
})

test("Basic blockset js object converts correctly to BlockSet", () => {

	const testBlockSetObj = {
		v: 1,
		name: "Test block set",
		requireActive: true,
		annoyMode: true,
		timeAllowed: 42, // milliseconds
		resetTime: 42, // milliseconds from midnight
		lastReset: 42, // millisecods from 1970
		activeDays: new Array(7).fill(false),
		activeTime: { from: 42, to: 1337 }, // milliseconds from midnight
		blacklist: [{ type: "urlEquals" , value: "asdf" }],
		whitelist: [{ type: "ytChannel", value: { name: "asdf", id: "ID" } }]
	}

	const testBlockSet = new BlockSet()
	testBlockSet.name = "Test block set"
	testBlockSet.requireActive = true
	testBlockSet.annoyMode = true
	testBlockSet.timeAllowed = 42
	testBlockSet.resetTime = 42
	testBlockSet.lastReset = 42
	testBlockSet.activeDays = new Array(7).fill(false)
	testBlockSet.activeTime = { from: 42, to: 1337 }
	testBlockSet.blacklist = [{ type: "urlEquals" , value: "asdf" }]
	testBlockSet.whitelist = [{ type: "ytChannel", value: { name: "asdf", id: "ID" } }]

	expect(plainToBlockSet(testBlockSetObj)).toStrictEqual(testBlockSet)
})