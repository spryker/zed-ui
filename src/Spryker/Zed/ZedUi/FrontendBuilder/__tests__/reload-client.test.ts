import { describe, expect, it } from '@jest/globals';
import { classifyManifestDiff, resolveStylesheetSwaps } from '../libs/reload/client/reload-client.ts';

const stylesheetHash = 'aaaa';
const mainChunkHash = 'bbbb';

const baselineManifest = {
    buildId: 1,
    assets: {
        'main.js': mainChunkHash,
        'styles.css': stylesheetHash,
    },
};

describe('classifyManifestDiff', () => {
    it('returns none when only the buildId changed, so an identical recompilation never reloads', () => {
        const next = { ...baselineManifest, buildId: 2 };

        expect(classifyManifestDiff(baselineManifest, next)).toBe('none');
    });

    it('returns css-only when just a stylesheet hash changed', () => {
        const next = { buildId: 2, assets: { 'main.js': mainChunkHash, 'styles.css': 'cccc' } };

        expect(classifyManifestDiff(baselineManifest, next)).toBe('css-only');
    });

    it('returns full-reload when a javascript chunk hash changed', () => {
        const next = { buildId: 2, assets: { 'main.js': 'dddd', 'styles.css': stylesheetHash } };

        expect(classifyManifestDiff(baselineManifest, next)).toBe('full-reload');
    });

    it('returns full-reload when an asset key appeared or vanished', () => {
        const next = {
            buildId: 2,
            assets: { 'main.js': mainChunkHash, 'styles.css': stylesheetHash, 'spy/merchant-portal.js': 'eeee' },
        };

        expect(classifyManifestDiff(baselineManifest, next)).toBe('full-reload');
    });
});

describe('resolveStylesheetSwaps', () => {
    it('pairs a changed stylesheet with the page link that serves it and adds a cache-buster', () => {
        const swaps = resolveStylesheetSwaps(
            [{ assetKey: 'styles.css', hash: 'cccc' }],
            [{ href: '/assets/js/styles.css?v=aaaa' }, { href: '/assets/js/main.js' }],
        );

        expect(swaps).toEqual([
            { link: { href: '/assets/js/styles.css?v=aaaa' }, newHref: '/assets/js/styles.css?v=cccc' },
        ]);
    });

    it('produces no swap when the page has no link for the changed stylesheet', () => {
        const swaps = resolveStylesheetSwaps(
            [{ assetKey: 'spy/merchant-portal.css', hash: 'cccc' }],
            [{ href: '/assets/js/styles.css' }],
        );

        expect(swaps).toEqual([]);
    });
});
