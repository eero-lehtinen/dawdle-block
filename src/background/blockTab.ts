/**
 * In the future replace tab with block page
 * @param tabId 
 */
export const blockTab = (_tabId: number): void => {
	/* TODO: implement */
}

/** Returns true if url is block page. Block pages should not get endlessly blocked. */
export const isBlockPage = (url: string): boolean => {
	return url.endsWith("block-page.html")
}