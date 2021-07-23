import { Result, ok, err, ResultAsync } from "neverthrow"
import { z } from "zod"

/** Convert zod safeParse result into a neverthrow result */
export const neverThrowZodParse = <T, E extends z.ZodError>(safeParseResult: {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
}): ZodResDefault<T>  => {
	if (!safeParseResult.success) {
		return err(safeParseResult.error.issues)
	}
	return ok(safeParseResult.data)
}

export type ZodResDefault<T> = Result<T, z.ZodIssue[]> 
export type ZodRes<T, E> = Result<T, z.ZodIssue[] | E>

export type ZodResDefaultAsync<T> = ResultAsync<T, z.ZodIssue[]> 
export type ZodResAsync<T, E> = ResultAsync<T, z.ZodIssue[] | E>

export enum ParseError {
	NullOrUndefined = "NullOrUndefined",
	CantIdentifyVersion = "CantIdentifyVersion",
}

/* eslint-disable @typescript-eslint/no-explicit-any, 
	@typescript-eslint/explicit-module-boundary-types */

/** Checks if passed object should be parsed with v0 parser */
export const parseableV0 = (obj: any): boolean => 
	typeof obj === "object" && (!("v" in obj) || obj.v < 1)

/** Checks if passed object should be parsed with vN parser */
export const parseableVN = (v: number, obj: any): boolean => {
	if (v < 1) throw new Error("v needs to be 1 or more")
	return typeof obj === "object" && "v" in obj && obj.v === v
}

