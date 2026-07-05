import { describe, expect, it } from 'bun:test';

import { withImageExtension } from './objectKey';

describe('withImageExtension', () => {
    it('appends the extension derived from known image content-types', () => {
        expect(withImageExtension('carrot', 'image/webp')).toBe('carrot.webp');
        expect(withImageExtension('carrot', 'image/png')).toBe('carrot.png');
        expect(withImageExtension('carrot', 'image/jpeg')).toBe('carrot.jpg');
        expect(withImageExtension('recipe-image/abc', 'image/svg+xml')).toBe('recipe-image/abc.svg');
    });

    it('ignores charset parameters and casing', () => {
        expect(withImageExtension('carrot', 'IMAGE/PNG; charset=binary')).toBe('carrot.png');
    });

    it('falls back to the subtype for other image types', () => {
        expect(withImageExtension('carrot', 'image/heic')).toBe('carrot.heic');
    });

    it('is idempotent when the extension is already present', () => {
        expect(withImageExtension('carrot.webp', 'image/webp')).toBe('carrot.webp');
        expect(withImageExtension('carrot.WEBP', 'image/webp')).toBe('carrot.WEBP');
    });

    it('leaves the key unchanged for missing or non-image content-types', () => {
        expect(withImageExtension('carrot', undefined)).toBe('carrot');
        expect(withImageExtension('carrot', '')).toBe('carrot');
        expect(withImageExtension('carrot', 'application/json')).toBe('carrot');
    });
});
