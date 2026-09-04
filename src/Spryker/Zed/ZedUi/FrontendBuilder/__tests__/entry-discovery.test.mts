import { relative } from 'node:path';
import { describe, it, expect } from '@jest/globals';
import { SINGLE_ENTRY_POINT_NAME, resolveBuilderSettings } from '../settings.mts';
import { discoverEntryPoints } from '../libs/entry-points.mts';
import { fixturePath } from './helpers/fixtures.mts';

const discoverIn = async (caseName: string) => {
    const context = fixturePath(caseName);
    const discovered = await discoverEntryPoints(resolveBuilderSettings(context));

    return {
        ...discovered,
        relativeEntryPointFiles: discovered.entryPointFiles.map((file) => relative(context, file)),
        relativeSharedChunkFiles: (discovered.entryPointsMap[SINGLE_ENTRY_POINT_NAME] as string[]).map((file) =>
            relative(context, file),
        ),
    };
};

describe('entry point discovery in the monorepo layout', () => {
    it('lists every core and project entry file it found, core tree first', async () => {
        const { relativeEntryPointFiles } = await discoverIn('monorepo-layout');

        expect(relativeEntryPointFiles).toEqual([
            'src/Spryker/GuiTable/src/Spryker/Zed/GuiTable/Presentation/Components/entry.ts',
            'src/Spryker/SharedNameGui/src/Spryker/Zed/SharedNameGui/Presentation/Components/entry.ts',
            'src/Spryker/ZedUi/src/Spryker/Zed/ZedUi/Presentation/Components/entry.ts',
            'src/Pyz/SharedNameGui/src/Pyz/Zed/SharedNameGui/Presentation/Components/entry.ts',
        ]);
    });

    it('collects every marker-carrying module into the shared chunk instead of one entry each', async () => {
        const { entryPointsMap, relativeSharedChunkFiles } = await discoverIn('monorepo-layout');

        expect(relativeSharedChunkFiles).toEqual([
            'src/Spryker/GuiTable/src/Spryker/Zed/GuiTable/Presentation/Components/entry.ts',
            'src/Spryker/ZedUi/src/Spryker/Zed/ZedUi/Presentation/Components/entry.ts',
        ]);
        expect(entryPointsMap[SINGLE_ENTRY_POINT_NAME]).toHaveLength(2);
    });

    it('gives an unmarked module a webpack entry of its own, named after its dasherized module directory', async () => {
        const { entryPointsMap } = await discoverIn('monorepo-layout');

        expect(Object.keys(entryPointsMap)).toEqual(['spy/shared-name-gui', SINGLE_ENTRY_POINT_NAME]);
    });

    it('lets a project module override the core module of the same name', async () => {
        const context = fixturePath('monorepo-layout');
        const { entryPointsMap } = await discoverIn('monorepo-layout');

        expect(relative(context, entryPointsMap['spy/shared-name-gui'] as string)).toBe(
            'src/Pyz/SharedNameGui/src/Pyz/Zed/SharedNameGui/Presentation/Components/entry.ts',
        );
    });
});

describe('entry point discovery in the vendor/project layout', () => {
    it('finds the core modules under vendor/spryker and the project modules under src/Pyz', async () => {
        const { relativeEntryPointFiles } = await discoverIn('project-layout');

        expect(relativeEntryPointFiles).toEqual([
            'vendor/spryker/gui-table/src/Spryker/Zed/GuiTable/Presentation/Components/entry.ts',
            'vendor/spryker/zed-ui/src/Spryker/Zed/ZedUi/Presentation/Components/entry.ts',
            'src/Pyz/Zed/ProjectDashboardGui/Presentation/Components/entry.ts',
        ]);
    });

    it('derives the same shared chunk from the dasherized vendor package directories', async () => {
        const { entryPointsMap, relativeSharedChunkFiles } = await discoverIn('project-layout');

        expect(relativeSharedChunkFiles).toEqual([
            'vendor/spryker/gui-table/src/Spryker/Zed/GuiTable/Presentation/Components/entry.ts',
            'vendor/spryker/zed-ui/src/Spryker/Zed/ZedUi/Presentation/Components/entry.ts',
        ]);
        expect(entryPointsMap[SINGLE_ENTRY_POINT_NAME]).toHaveLength(2);
    });

    it('discovers a project module that has no core counterpart', async () => {
        const context = fixturePath('project-layout');
        const { entryPointsMap } = await discoverIn('project-layout');

        expect(relative(context, entryPointsMap['spy/project-dashboard-gui'] as string)).toBe(
            'src/Pyz/Zed/ProjectDashboardGui/Presentation/Components/entry.ts',
        );
    });
});

describe('entry point discovery failure', () => {
    it('reports the scanned directories and the consequence when no entry file matches', async () => {
        const context = fixturePath('new-core-module');
        const settings = resolveBuilderSettings(context);
        const settingsWithWrongTree = {
            ...settings,
            paths: { ...settings.paths, coreModulesDirectory: `${context}/src/NotSpryker` },
        };

        await expect(discoverEntryPoints(settingsWithWrongTree)).rejects.toThrow(
            /No Merchant Portal entry point was found for .*new-core-module/,
        );
        await expect(discoverEntryPoints(settingsWithWrongTree)).rejects.toThrow(
            /src\/NotSpryker[\s\S]*would be empty[\s\S]*Run the build from the project root/,
        );
    });
});
