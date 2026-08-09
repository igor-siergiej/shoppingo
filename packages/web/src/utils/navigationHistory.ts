// Tracks how many times the SPA has changed route since the current full
// page load, so `useGoBack` can tell a real in-app back-navigation apart
// from a fresh page load / deep link (where there's nothing to pop back to).
let navigationDepth = 0;

export const recordInAppNavigation = (): void => {
    navigationDepth += 1;
};

// True once we've moved past the very first location recorded for this
// page load — i.e. `navigate(-1)` has somewhere real to land.
export const hasInAppBackHistory = (): boolean => navigationDepth > 1;

// Test-only: resets module state between test cases. Do not call from
// application code.
// fallow-ignore-next-line unused-export
export const resetNavigationDepthForTests = (): void => {
    navigationDepth = 0;
};
