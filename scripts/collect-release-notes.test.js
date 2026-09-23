import { describe, expect, it } from 'bun:test';
import { collectNotes, commitToNote, extractTrailer, parseCommits, upsertRelease } from './collect-release-notes.js';

const commit = (subject, body = '') => ({ hash: 'abc1234', subject, body });

describe('extractTrailer', () => {
    it('joins a trailer that wraps over several lines', () => {
        const body = [
            'Some technical prose.',
            '',
            'Release-Notes: Recipe imports now show',
            'progress as they run.',
        ].join('\n');

        expect(extractTrailer(body)).toBe('Recipe imports now show progress as they run.');
    });

    it('stops at the next trailer rather than swallowing it', () => {
        const body = [
            'Release-Notes: Dark mode remembers your choice.',
            'Co-authored-by: Someone <someone@example.com>',
        ].join('\n');

        expect(extractTrailer(body)).toBe('Dark mode remembers your choice.');
    });

    it('returns null when the trailer is absent or empty', () => {
        expect(extractTrailer('No trailer here.')).toBeNull();
        expect(extractTrailer('Release-Notes:   ')).toBeNull();
    });
});

describe('commitToNote', () => {
    it('prefers the trailer over the commit subject', () => {
        const note = commitToNote(
            commit('feat(web): rework drawer into route', 'Release-Notes: Use-it-up search is now a full page.')
        );

        expect(note).toEqual({ type: 'feature', text: 'Use-it-up search is now a full page.' });
    });

    it('falls back to the subject, without scope or PR reference', () => {
        const note = commitToNote(commit('fix(web): widen recipes grid on desktop (#160)'));

        expect(note).toEqual({ type: 'fix', text: 'Widen recipes grid on desktop' });
    });

    it('publishes a normally invisible commit type when it carries a trailer', () => {
        const note = commitToNote(commit('chore: bump image sizes', 'Release-Notes: Photos load faster on mobile.'));

        expect(note).toEqual({ type: 'improvement', text: 'Photos load faster on mobile.' });
    });

    it('omits commits with no trailer and no user-facing type', () => {
        expect(commitToNote(commit('chore: bump deps'))).toBeNull();
        expect(commitToNote(commit('test(web): add coverage for drawer'))).toBeNull();
        expect(commitToNote(commit('not a conventional commit'))).toBeNull();
    });

    it("omits semantic-release's own release commits", () => {
        expect(
            commitToNote(commit('chore(release): 1.73.0 [skip ci]', 'Release-Notes: should never surface'))
        ).toBeNull();
    });
});

describe('collectNotes', () => {
    it('keeps commit order and drops repeated lines', () => {
        const notes = collectNotes([
            commit('feat(web): newest thing'),
            commit('fix(api): something', 'Release-Notes: Newest thing'),
            commit('fix(web): older fix'),
        ]);

        expect(notes).toEqual([
            { type: 'feature', text: 'Newest thing' },
            { type: 'fix', text: 'Older fix' },
        ]);
    });
});

describe('parseCommits', () => {
    it('reads the multi-line bodies git log emits', () => {
        const raw = 'abc\u001ffeat: one\u001fRelease-Notes: First\nline two\u001e\ndef\u001ffix: two\u001f\u001e';

        expect(parseCommits(raw)).toEqual([
            { hash: 'abc', subject: 'feat: one', body: 'Release-Notes: First\nline two' },
            { hash: 'def', subject: 'fix: two', body: '' },
        ]);
    });
});

describe('upsertRelease', () => {
    it('replaces an existing version instead of duplicating it', () => {
        const releases = [{ version: '1.2.0', date: '2026-01-01', notes: [{ type: 'fix', text: 'Old' }] }];
        const updated = upsertRelease(releases, {
            version: '1.2.0',
            date: '2026-01-02',
            notes: [{ type: 'fix', text: 'New' }],
        });

        expect(updated).toEqual([{ version: '1.2.0', date: '2026-01-02', notes: [{ type: 'fix', text: 'New' }] }]);
    });

    it('orders releases newest-first numerically, not lexically', () => {
        const releases = [
            { version: '1.9.0', date: '2026-01-01', notes: [] },
            { version: '1.10.0', date: '2026-01-02', notes: [] },
        ];
        const updated = upsertRelease(releases, { version: '1.10.1', date: '2026-01-03', notes: [] });

        expect(updated.map((release) => release.version)).toEqual(['1.10.1', '1.10.0', '1.9.0']);
    });
});
