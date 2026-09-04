import { describe, it, expect } from '@jest/globals';
import { resolveBuilderSettings } from '../settings.mts';
import {
    BUILD_CONFIGURATION_FILE_NAME,
    LINT_CONFIGURATION_FILE_NAME,
    SPEC_CONFIGURATION_FILE_NAME,
    reconcileTypeScriptConfigurations,
    type ReconciledTypeScriptConfiguration,
    type TypeScriptConfiguration,
} from '../libs/typescript-configuration.mts';
import { fixturePath } from './helpers/fixtures.mts';

const reconcileFixture = (fixtureName: string): Promise<ReconciledTypeScriptConfiguration[]> =>
    reconcileTypeScriptConfigurations(resolveBuilderSettings(fixturePath(fixtureName)));

const configurationOf = (
    reconciledConfigurations: ReconciledTypeScriptConfiguration[],
    fileName: string,
): TypeScriptConfiguration => {
    const reconciledConfiguration = reconciledConfigurations.find((candidate) => candidate.fileName === fileName);

    if (reconciledConfiguration === undefined) {
        throw new Error(`The reconciliation did not produce ${fileName}.`);
    }

    return reconciledConfiguration.configuration;
};

describe('writing the Merchant Portal TypeScript configurations from scratch', () => {
    it('reports every configuration file as created when the project root has none', async () => {
        const reconciledConfigurations = await reconcileFixture('configuration-monorepo');

        expect(reconciledConfigurations.map(({ fileName, wasCreated }) => [fileName, wasCreated])).toEqual([
            [BUILD_CONFIGURATION_FILE_NAME, true],
            [SPEC_CONFIGURATION_FILE_NAME, true],
            [LINT_CONFIGURATION_FILE_NAME, true],
        ]);
    });

    it('points the polyfills alias at the discovered core module directory', async () => {
        const buildConfiguration = configurationOf(
            await reconcileFixture('configuration-monorepo'),
            BUILD_CONFIGURATION_FILE_NAME,
        );

        expect(buildConfiguration.compilerOptions?.paths?.['@mp/polyfills']).toEqual([
            '../../../../../../../../src/Spryker/ZedUi/src/Spryker/Zed/ZedUi/Presentation/Components/mp.polyfills.ts',
        ]);
    });

    it('discovers the kebab-cased module directory of the vendor layout', async () => {
        const reconciledConfigurations = await reconcileFixture('configuration-project');

        expect(
            configurationOf(reconciledConfigurations, BUILD_CONFIGURATION_FILE_NAME).compilerOptions?.paths?.[
                '@mp/polyfills'
            ],
        ).toEqual([
            '../../../../../../../../vendor/spryker/zed-ui/src/Spryker/Zed/ZedUi/Presentation/Components/mp.polyfills.ts',
        ]);
        expect(configurationOf(reconciledConfigurations, SPEC_CONFIGURATION_FILE_NAME).files).toEqual([
            '../../../../../../../../vendor/spryker/zed-ui/src/Spryker/Zed/ZedUi/FrontendBuilder/test-setup.ts',
        ]);
    });

    it('includes the core sources of the layout it runs in', async () => {
        const lintConfiguration = configurationOf(
            await reconcileFixture('configuration-project'),
            LINT_CONFIGURATION_FILE_NAME,
        );

        expect(lintConfiguration.include).toEqual([
            '../../../../../../../../vendor/spryker/*/src/Spryker/Zed/*/Presentation/Components/*.ts',
            '../../../../../../../../src/Pyz/Zed/*/Presentation/Components/*.ts',
        ]);
    });

    it.each([
        ['configuration-monorepo', 'src/Spryker/ZedUi/src/Spryker/Zed/ZedUi/FrontendBuilder'],
        ['configuration-project', 'vendor/spryker/zed-ui/src/Spryker/Zed/ZedUi/FrontendBuilder'],
    ])(
        'writes every configuration into the builder of %s when the project root has none',
        async (fixtureName, builderDirectory) => {
            const reconciledConfigurations = await reconcileFixture(fixtureName);

            expect(reconciledConfigurations.map(({ fileName, configurationPath }) => configurationPath)).toEqual([
                `${builderDirectory}/${BUILD_CONFIGURATION_FILE_NAME}`,
                `${builderDirectory}/${SPEC_CONFIGURATION_FILE_NAME}`,
                `${builderDirectory}/${LINT_CONFIGURATION_FILE_NAME}`,
            ]);
        },
    );

    it('works on the file the project keeps in its root instead of writing a second copy', async () => {
        const reconciledConfigurations = await reconcileFixture('configuration-existing');
        const pathOf = (fileName: string): string | undefined =>
            reconciledConfigurations.find((candidate) => candidate.fileName === fileName)?.configurationPath;

        // The fixture root holds only the build configuration, so only that one is claimed by it.
        expect(pathOf(BUILD_CONFIGURATION_FILE_NAME)).toBe(BUILD_CONFIGURATION_FILE_NAME);
        expect(pathOf(LINT_CONFIGURATION_FILE_NAME)).toBe(
            `src/Spryker/ZedUi/src/Spryker/Zed/ZedUi/FrontendBuilder/${LINT_CONFIGURATION_FILE_NAME}`,
        );
    });

    it('addresses the build configuration as a sibling when both are generated into the builder', async () => {
        const reconciledConfigurations = await reconcileFixture('configuration-monorepo');

        expect(configurationOf(reconciledConfigurations, LINT_CONFIGURATION_FILE_NAME).extends).toBe(
            `./${BUILD_CONFIGURATION_FILE_NAME}`,
        );
        expect(configurationOf(reconciledConfigurations, BUILD_CONFIGURATION_FILE_NAME).extends).toBe(
            '../../../../../../../../tsconfig.json',
        );
    });

    it('climbs to the build configuration the project keeps in its root', async () => {
        const reconciledConfigurations = await reconcileFixture('configuration-existing');

        expect(configurationOf(reconciledConfigurations, LINT_CONFIGURATION_FILE_NAME).extends).toBe(
            `../../../../../../../../${BUILD_CONFIGURATION_FILE_NAME}`,
        );
    });

    it('explains which file is missing when no core module provides the polyfills', async () => {
        await expect(reconcileFixture('configuration-missing-polyfills')).rejects.toThrow(
            /mp\.polyfills\.ts.*configuration-missing-polyfills[\s\S]*discover it[\s\S]*mp:update:config/,
        );
    });
});

describe('reconciling configurations a project already has', () => {
    it('leaves compiler options the project chose untouched', async () => {
        const buildConfiguration = configurationOf(
            await reconcileFixture('configuration-existing'),
            BUILD_CONFIGURATION_FILE_NAME,
        );

        expect(buildConfiguration.compilerOptions?.target).toBe('ES2015');
        expect(buildConfiguration.compilerOptions?.noUnusedLocals).toBe(true);
    });

    it('reports the configurations as pre-existing rather than created', async () => {
        const reconciledConfigurations = await reconcileFixture('configuration-existing');

        expect(configurationOf(reconciledConfigurations, BUILD_CONFIGURATION_FILE_NAME)).toBeDefined();
        expect(reconciledConfigurations.map(({ fileName, wasCreated }) => [fileName, wasCreated])).toEqual([
            [BUILD_CONFIGURATION_FILE_NAME, false],
            [SPEC_CONFIGURATION_FILE_NAME, false],
            [LINT_CONFIGURATION_FILE_NAME, true],
        ]);
    });

    it('rewrites the aliases a different source layout had left behind', async () => {
        const buildConfiguration = configurationOf(
            await reconcileFixture('configuration-existing'),
            BUILD_CONFIGURATION_FILE_NAME,
        );

        expect(buildConfiguration.compilerOptions?.paths?.['@mp/gui-table']).toEqual([
            './src/Spryker/GuiTable/mp.public-api.ts',
        ]);
        expect(buildConfiguration.compilerOptions?.paths?.['@mp/polyfills']).toEqual([
            './src/Spryker/ZedUi/src/Spryker/Zed/ZedUi/Presentation/Components/mp.polyfills.ts',
        ]);
        expect(buildConfiguration.compilerOptions?.paths).not.toHaveProperty('@mp/removed-merchant-portal-gui');
    });

    it('keeps an alias the project added itself', async () => {
        const buildConfiguration = configurationOf(
            await reconcileFixture('configuration-existing'),
            BUILD_CONFIGURATION_FILE_NAME,
        );

        expect(buildConfiguration.compilerOptions?.paths?.['@mp/customer-shared']).toEqual([
            './src/Pyz/Shared/mp.shared.ts',
        ]);
    });

    it('replaces the stale core include glob while keeping the entry the project added', async () => {
        const buildConfiguration = configurationOf(
            await reconcileFixture('configuration-existing'),
            BUILD_CONFIGURATION_FILE_NAME,
        );

        expect(buildConfiguration.include).toEqual([
            'src/Pyz/ZedUi/src/Pyz/Zed/ZedUi/Presentation/Components/main.ts',
            'src/Pyz/ZedUi/src/Pyz/Zed/ZedUi/Presentation/Components/polyfills.ts',
            'src/Pyz/ZedUi/src/Pyz/Zed/ZedUi/Presentation/Components/environments/environment.prod.ts',
            'src/Spryker/*/src/Spryker/Zed/*/Presentation/Components/entry.ts',
            'src/Pyz/*/src/Pyz/Zed/*/Presentation/Components/entry.ts',
            'src/Pyz/Custom/hand-written.ts',
        ]);
    });

    it('repoints the test setup file at the module directory of the current layout', async () => {
        const specConfiguration = configurationOf(
            await reconcileFixture('configuration-existing'),
            SPEC_CONFIGURATION_FILE_NAME,
        );

        expect(specConfiguration.files).toEqual([
            '../../../../../../../../src/Spryker/ZedUi/src/Spryker/Zed/ZedUi/FrontendBuilder/test-setup.ts',
        ]);
        expect(specConfiguration.compilerOptions?.types).toEqual(['jest', 'node', 'custom-project-types']);
    });
});
