import { describe, it, expect } from '@jest/globals';
import { resolveBuilderSettings } from '../settings.mts';
import { buildGeneratedModulePathAliases, mergeModulePathAliases } from '../libs/module-path-aliases.mts';
import { fixturePath } from './helpers/fixtures.mts';

const committedAliases = {
    '@mp/gui-table': ['src/Spryker/GuiTable/mp.public-api.ts'],
    '@mp/removed-merchant-portal-gui': ['src/Spryker/RemovedMerchantPortalGui/mp.public-api.ts'],
    '@mp/polyfills': ['./src/Spryker/ZedUi/src/Spryker/Zed/ZedUi/Presentation/Components/mp.polyfills.ts'],
    '@mp/customer-shared': ['./src/Pyz/Shared/mp.shared.ts'],
};

const generateForNewCoreModuleFixture = () =>
    buildGeneratedModulePathAliases(resolveBuilderSettings(fixturePath('new-core-module')));

describe('generated @mp/* module path aliases', () => {
    it('gives a newly added core module an alias derived from its module directory', async () => {
        const generatedAliases = await generateForNewCoreModuleFixture();

        expect(generatedAliases['@mp/brand-new-merchant-portal-gui']).toEqual([
            './src/Spryker/BrandNewMerchantPortalGui/mp.public-api.ts',
        ]);
    });

    it('emits every value as a relative path, because TypeScript rejects non-relative paths without baseUrl', async () => {
        const generatedAliases = await generateForNewCoreModuleFixture();
        const generatedValues = Object.values(generatedAliases).flat();

        expect(generatedValues).not.toHaveLength(0);
        generatedValues.forEach((generatedValue) => {
            expect(generatedValue.startsWith('./')).toBe(true);
        });
    });

    it('emits vendor-relative values in the vendor/project layout', async () => {
        const generatedAliases = await buildGeneratedModulePathAliases(
            resolveBuilderSettings(fixturePath('project-layout')),
        );

        expect(generatedAliases['@mp/gui-table']).toEqual(['./vendor/spryker/gui-table/mp.public-api.ts']);
    });
});

describe('merging generated aliases into a committed tsconfig', () => {
    it('overwrites a committed generated alias that lost its leading ./', async () => {
        const merged = mergeModulePathAliases(committedAliases, await generateForNewCoreModuleFixture());

        expect(merged['@mp/gui-table']).toEqual(['./src/Spryker/GuiTable/mp.public-api.ts']);
    });

    it('drops a committed generated alias whose module no longer exists', async () => {
        const merged = mergeModulePathAliases(committedAliases, await generateForNewCoreModuleFixture());

        expect(merged).not.toHaveProperty(['@mp/removed-merchant-portal-gui']);
    });

    it('keeps a hand-written alias that points outside the core modules directory', async () => {
        const merged = mergeModulePathAliases(committedAliases, await generateForNewCoreModuleFixture());

        expect(merged['@mp/customer-shared']).toEqual(['./src/Pyz/Shared/mp.shared.ts']);
    });

    // The polyfills alias used to be hand-written, which is why it kept pointing at src/Spryker in
    // projects that install the core into vendor. It is generated now, so a committed one is stale.
    it('drops a committed polyfills alias, because the generator owns that alias now', async () => {
        const merged = mergeModulePathAliases(committedAliases, await generateForNewCoreModuleFixture());

        expect(merged).not.toHaveProperty(['@mp/polyfills']);
    });

    it('adds the newly discovered module that the committed tsconfig did not know about', async () => {
        const merged = mergeModulePathAliases(committedAliases, await generateForNewCoreModuleFixture());

        expect(Object.keys(merged)).toEqual([
            '@mp/brand-new-merchant-portal-gui',
            '@mp/gui-table',
            '@mp/customer-shared',
        ]);
    });

    it('replaces monorepo-shaped committed aliases when regenerating under the vendor layout', async () => {
        const generatedAliases = await buildGeneratedModulePathAliases(
            resolveBuilderSettings(fixturePath('project-layout')),
        );

        const mergedAliases = mergeModulePathAliases(committedAliases, generatedAliases);

        expect(mergedAliases['@mp/gui-table']).toEqual(['./vendor/spryker/gui-table/mp.public-api.ts']);
        expect(mergedAliases).not.toHaveProperty('@mp/removed-merchant-portal-gui');
        expect(mergedAliases['@mp/customer-shared']).toEqual(committedAliases['@mp/customer-shared']);
    });
});

describe('ownership of an alias the generator emits', () => {
    it('corrects a committed value that was edited by hand', async () => {
        const merged = mergeModulePathAliases(
            { '@mp/gui-table': ['./src/Spryker/GuiTable/mp.stale-api.ts'] },
            await generateForNewCoreModuleFixture(),
        );

        expect(merged['@mp/gui-table']).toEqual(['./src/Spryker/GuiTable/mp.public-api.ts']);
    });
});
