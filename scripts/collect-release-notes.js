#!/usr/bin/env bun

/**
 * Collect user-facing release notes for a release and record them in
 * packages/web/src/data/release-notes.json, which the web app bundles and shows
 * in its "What's new" panel.
 *
 * Notes come from the commits in the release range. A commit states its own
 * user-facing line with a `Release-Notes:` trailer in the commit body:
 *
 *     feat(web): Waste Warrior becomes a full page instead of a drawer
 *
 *     <technical body>
 *
 *     Release-Notes: Use-it-up ingredient search is now a full page, so results
 *     aren't squashed behind the keyboard.
 *
 * Commits without a trailer fall back to their conventional-commit subject, so
 * the panel is never empty regardless of who (or what) authored the commit.
 *
 * Usage: bun scripts/collect-release-notes.js <version> [<sinceRef>]
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export const NOTES_FILE = path.join(rootDir, 'packages', 'web', 'src', 'data', 'release-notes.json');

const FIELD_SEP = '\u001f';
const RECORD_SEP = '\u001e';

/** Conventional-commit types that describe a change a user can notice. */
const USER_FACING_TYPES = {
    feat: 'feature',
    fix: 'fix',
    perf: 'improvement',
};

const HEADER_PATTERN = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/;
const TRAILER_PATTERN = /^release-notes:[ \t]*(.*)$/i;
/** Any other `Token: value` trailer line, which terminates a Release-Notes block. */
const OTHER_TRAILER_PATTERN = /^[A-Za-z][A-Za-z-]*:[ \t]/;

/**
 * Pull the `Release-Notes:` trailer out of a commit body. The value may wrap
 * over following lines; it ends at a blank line, another trailer, or the body's
 * end. Returns null when the commit has no trailer.
 */
export const extractTrailer = (body) => {
    const lines = (body ?? '').split('\n');
    const start = lines.findIndex((line) => TRAILER_PATTERN.test(line.trim()));

    if (start === -1) return null;

    const parts = [lines[start].trim().match(TRAILER_PATTERN)[1].trim()];

    for (const line of lines.slice(start + 1)) {
        const trimmed = line.trim();

        if (trimmed === '' || OTHER_TRAILER_PATTERN.test(trimmed)) break;

        parts.push(trimmed);
    }

    const text = parts.filter(Boolean).join(' ').trim();

    return text === '' ? null : text;
};

/** Split a conventional-commit subject into its parts, or null if it isn't one. */
export const parseHeader = (subject) => {
    const match = (subject ?? '').trim().match(HEADER_PATTERN);

    if (!match) return null;

    const [, type, scope, breaking, description] = match;

    return { type: type.toLowerCase(), scope: scope ?? null, breaking: breaking === '!', description };
};

/** Turn a commit subject into a readable sentence: drop the PR ref, capitalise. */
export const tidySubject = (description) => {
    const withoutRef = description.replace(/\s*\(#\d+\)\s*$/, '').trim();

    return withoutRef.charAt(0).toUpperCase() + withoutRef.slice(1);
};

/**
 * Map one commit to a note. An explicit trailer always wins and always
 * publishes, even on a commit type that is normally invisible (a `chore` that
 * users can genuinely see, say). Without a trailer, only user-facing types
 * publish, using their subject.
 */
export const commitToNote = (commit) => {
    const header = parseHeader(commit.subject);

    if (!header) return null;
    // Release commits are semantic-release's own bookkeeping, never a note.
    if (header.type === 'chore' && header.scope === 'release') return null;

    const trailer = extractTrailer(commit.body);
    const type = USER_FACING_TYPES[header.type];

    if (!trailer && !type) return null;

    return { type: type ?? 'improvement', text: trailer ?? tidySubject(header.description) };
};

/** Notes for a set of commits, newest first, without duplicate lines. */
export const collectNotes = (commits) => {
    const seen = new Set();
    const notes = [];

    for (const commit of commits) {
        const note = commitToNote(commit);

        if (!note) continue;

        const key = note.text.toLowerCase();

        if (seen.has(key)) continue;

        seen.add(key);
        notes.push(note);
    }

    return notes;
};

const compareVersionsDesc = (a, b) => {
    const parse = (version) => version.split('.').map((part) => Number.parseInt(part, 10) || 0);
    const [aMajor, aMinor, aPatch] = parse(a.version);
    const [bMajor, bMinor, bPatch] = parse(b.version);

    return bMajor - aMajor || bMinor - aMinor || bPatch - aPatch;
};

/** Insert (or replace) a release entry, keeping the file newest-first. */
export const upsertRelease = (releases, entry) => {
    const others = releases.filter((release) => release.version !== entry.version);

    return [...others, entry].sort(compareVersionsDesc);
};

export const parseCommits = (raw) =>
    raw
        .split(RECORD_SEP)
        .map((record) => record.trim())
        .filter(Boolean)
        .map((record) => {
            const [hash, subject, body = ''] = record.split(FIELD_SEP);

            return { hash, subject, body };
        });

const readCommits = (sinceRef) => {
    const range = [];

    if (sinceRef) {
        try {
            execFileSync('git', ['rev-parse', '--verify', `${sinceRef}^{commit}`], { stdio: 'ignore' });
            range.push(`${sinceRef}..HEAD`);
        } catch {
            console.warn(`Ref "${sinceRef}" not found; collecting notes from the full history instead.`);
        }
    }

    const raw = execFileSync(
        'git',
        ['log', '--no-merges', `--format=%H${FIELD_SEP}%s${FIELD_SEP}%b${RECORD_SEP}`, ...range],
        { cwd: rootDir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
    );

    return parseCommits(raw);
};

export const readReleases = (file = NOTES_FILE) => {
    if (!fs.existsSync(file)) return [];

    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));

    return Array.isArray(parsed) ? parsed : [];
};

export const writeReleases = (releases, file = NOTES_FILE) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(releases, null, 2)}\n`);
};

const main = () => {
    const [version, sinceRef] = process.argv.slice(2);

    if (!version) {
        console.error('Error: Version argument is required');
        console.error('Usage: bun scripts/collect-release-notes.js <version> [<sinceRef>]');
        process.exit(1);
    }

    const notes = collectNotes(readCommits(sinceRef));

    if (notes.length === 0) {
        console.log(`No user-facing notes for ${version}; leaving release-notes.json unchanged.`);

        return;
    }

    const entry = { version, date: new Date().toISOString().slice(0, 10), notes };

    writeReleases(upsertRelease(readReleases(), entry));

    console.log(`Recorded ${notes.length} release note(s) for ${version}`);
};

if (import.meta.main) main();
