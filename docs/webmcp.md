# WebMCP tools

Shoppingo registers three [WebMCP](https://developer.chrome.com/docs/ai/webmcp) tools so a browser agent (for
example Gemini in Chrome) can act on the signed-in user's lists. Registration lives in
`packages/web/src/webmcp/registerTools.ts` and runs from `useWebMcpTools` in `RootLayout`.

| Tool | What it does | Annotations |
| --- | --- | --- |
| `getLists` | Lists the user's shopping lists with item counts | `readOnlyHint` |
| `addItemsToList` | Adds `{ name, quantity?, unit? }[]` to a list; duplicates merge | `consequentialHint` |
| `addRecipeToList` | Adds a recipe's ingredients to a list, scaled to `portions` | `consequentialHint` |

The tools call the same API client the UI uses, so they are subject to the same auth, rate limits and list
membership checks. Nothing is registered unless `document.modelContext.registerTool` exists, and tools are
withdrawn (via `AbortSignal`) on sign-out.

## Origin trial token

WebMCP is an origin trial in Chrome 149+. Register `https://shoppingo.imapps.uk` for the trial, then build the
web image with the token:

```
VITE_WEBMCP_OT_TOKEN=<token> bun run --filter @shoppingo/web build
```

The token is injected as an `origin-trial` meta tag **only in production builds** (`__IS_PROD__`). Dev builds and
builds without the variable add nothing, and browsers without WebMCP are unaffected.

## Verifying manually

1. Chrome 149+ with Gemini in Chrome. For local testing without a token enable
   `chrome://flags/#enable-webmcp-testing` and relaunch.
2. Sign in to shoppingo and open DevTools > WebMCP (or run `document.modelContext.getTools()` in the console):
   the three tools should be listed; they disappear after logging out.
3. In Gemini in Chrome, on the shoppingo tab ask: "What lists do I have?" (`getLists`), then
   "Add 2 litres of milk and a loaf of bread to my Groceries list" (`addItemsToList`), then
   "Add the ingredients for my Pasta recipe for 4 to Groceries" (`addRecipeToList`).
4. Confirm the items appear on the list; the agent should ask for confirmation before the two
   `consequentialHint` tools run.
