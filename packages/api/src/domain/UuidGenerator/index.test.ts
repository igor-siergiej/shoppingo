import { describe, it, expect, beforeEach } from 'vitest';
import { UuidGenerator } from './index';

describe('UuidGenerator', () => {
    let generator: UuidGenerator;

    beforeEach(() => {
        generator = new UuidGenerator();
    });

    describe('generate', () => {
        it('generates a valid UUID v4', () => {
            const id = generator.generate();

            expect(id).toBeDefined();
            expect(typeof id).toBe('string');
            expect(id.length).toBe(36);
        });

        it('generates UUIDs with correct format', () => {
            const id = generator.generate();
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            expect(uuidRegex.test(id)).toBe(true);
        });

        it('generates unique IDs on each call', () => {
            const id1 = generator.generate();
            const id2 = generator.generate();
            const id3 = generator.generate();

            expect(id1).not.toBe(id2);
            expect(id2).not.toBe(id3);
            expect(id1).not.toBe(id3);
        });

        it('generates IDs in correct UUID v4 format (version and variant bits)', () => {
            for (let i = 0; i < 10; i++) {
                const id = generator.generate();
                const parts = id.split('-');

                // Version is in the 13th character (3rd group, 1st char)
                const versionBit = parseInt(parts[2][0], 16);
                expect(versionBit).toBe(4); // Version 4

                // Variant is in the 17th character (4th group, 1st char)
                const variantBit = parseInt(parts[3][0], 16);
                expect([8, 9, 10, 11]).toContain(variantBit); // RFC 4122 variant
            }
        });

        it('generates different IDs across multiple iterations', () => {
            const ids = new Set();

            for (let i = 0; i < 100; i++) {
                ids.add(generator.generate());
            }

            expect(ids.size).toBe(100);
        });
    });

    describe('randomness', () => {
        it('produces different first segments across calls', () => {
            const segments = new Set();

            for (let i = 0; i < 20; i++) {
                const id = generator.generate();
                segments.add(id.split('-')[0]);
            }

            expect(segments.size).toBeGreaterThan(15);
        });

        it('generates IDs with varied entropy', () => {
            const ids: string[] = [];

            for (let i = 0; i < 50; i++) {
                ids.push(generator.generate());
            }

            // Check that not all IDs start with the same character
            const firstChars = new Set(ids.map((id) => id[0]));
            expect(firstChars.size).toBeGreaterThan(1);
        });
    });
});
