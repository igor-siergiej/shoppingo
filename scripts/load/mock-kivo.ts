/**
 * Stand-in for kivo's `GET /verify`, used to isolate shoppingo from kivo during load tests.
 *
 * Tokens are JWT-shaped (`header.payload.signature`) with `{ id, username }` in the payload; the
 * signature is never checked. This mirrors the verifier in `e2e/global-setup.ts`. It must only ever
 * sit behind a throwaway API instance, never behind a real deployment.
 */
const port = Number(process.env.MOCK_KIVO_PORT ?? 3199);

const decodeClaims = (authorization: string | null): { id?: string; username?: string } => {
    const payload = authorization?.split('.')[1];
    if (!payload) return {};
    try {
        return JSON.parse(Buffer.from(payload, 'base64').toString());
    } catch {
        return {};
    }
};

Bun.serve({
    port,
    fetch: (req) => {
        const { pathname } = new URL(req.url);
        if (req.method === 'GET' && pathname === '/verify') {
            const { id, username } = decodeClaims(req.headers.get('authorization'));
            if (!id || !username) return Response.json({ success: false }, { status: 401 });
            return Response.json({ success: true, payload: { id, username } });
        }
        return Response.json({ success: true });
    },
});

console.log(`mock kivo listening on :${port}`);
