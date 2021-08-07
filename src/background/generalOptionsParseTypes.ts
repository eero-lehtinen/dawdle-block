import { z } from "zod"

/* eslint-disable jsdoc/require-jsdoc*/
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

const makeZClockType = () => z.union([z.literal(12), z.literal(24)]).default(24)
export type ClockType = z.infer<ReturnType<typeof makeZClockType>>

const makeZSettingsProtection = () => z.enum(["never", "always", "timerZero"]).default("never")

export const defaultTypingTestWordCount = 30

export const makeZGeneralOptionsDataV0 = () =>
	z.object({
		v: z.union([z.undefined(), z.literal(0)]).transform((): 0 => 0),
		clockType: makeZClockType(),
		displayHelp: z.boolean().default(true),
		darkTheme: z.boolean().default(false),
		settingProtection: makeZSettingsProtection(),
		typingTestWordCount: z.number().int().default(defaultTypingTestWordCount),
	})

export type GeneralOptionsDataV0 = z.infer<ReturnType<typeof makeZGeneralOptionsDataV0>>

const makeZTheme = () => z.enum(["system", "dark", "light"]).default("system")

export type Theme = z.infer<ReturnType<typeof makeZTheme>>

export const makeZGeneralOptionsDataV1 = () =>
	makeZGeneralOptionsDataV0()
		.omit({ darkTheme: true })
		.extend({
			v: z.literal(1),
			theme: makeZTheme(),
		})

export type GeneralOptionsDataV1 = z.infer<ReturnType<typeof makeZGeneralOptionsDataV1>>

export type GeneralOptionsData = GeneralOptionsDataV1
