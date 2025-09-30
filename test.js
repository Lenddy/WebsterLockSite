/**
 * Calculate min/max breakpoints for a clamp() font-size
 * @param {number} minPx - minimum font size in px (ex: 20)
 * @param {number} preferredVw - coefficient for vw (ex: 1.49 for 1.49vw)
 * @param {number} preferredBasePx - base px value in preferred expression (ex: 8.6 for 0.537rem = 8.6px)
 * @param {number} maxPx - maximum font size in px (ex: 45)
 */
function calcClampBreakpoints(minPx, preferredBasePx, preferredVw, maxPx) {
	// Solve when preferred = min
	const minViewport = (minPx - preferredBasePx) / (preferredVw / 100);

	// Solve when preferred = max
	const maxViewport = (maxPx - preferredBasePx) / (preferredVw / 100);

	return {
		minFontSize: minPx,
		maxFontSize: maxPx,
		minViewport: Math.round(minViewport),
		maxViewport: Math.round(maxViewport),
	};
}

// Example from your clamp(1.25rem, 0.537rem + 1.49vw, 2.813rem)
// Convert rem to px assuming 1rem = 16px
const result = calcClampBreakpoints(
	0.813 * 16, // min = 20px
	0.55 * 16, // base = 8.6px
	1.4, // 1.49vw
	1.25 * 16 // max = 45px
);

console.log(result);
// {
//   minFontSize: 20,
//   maxFontSize: 45,
//   minViewport: 768,
//   maxViewport: 2435
// }
