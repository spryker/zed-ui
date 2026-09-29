import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it, expect, jest } from '@jest/globals';
import { resolveBuilderSettings } from '../settings.mts';
import {
    BUILD_CONFIGURATION_FILE_NAME,
    DEFAULTS_CONFIGURATION_FILE_NAME,
    LINT_CONFIGURATION_FILE_NAME,
    SPEC_CONFIGURATION_FILE_NAME,
    reconcileDefaultsConfiguration,
    reconcileProjectSolution,
    reconcileTypeScriptConfigurations,
    type ReconciledTypeScriptConfiguration,
    type TypeScriptConfiguration,
} from '../libs/typescript-configuration.mts';
import { applySolutionReconciliation } from '../libs/update-configuration.mts';
import { fixturePath } from './helpers/fixtures.mts';

const MONOREPO_BUILDER_DIRECTORY = 'src/Spryker/ZedUi/src/Spryker/Zed/ZedUi/FrontendBuilder';
const PROJECT_BUILDER_DIRECTORY = 'vendor/spryker/zed-ui/src/Spryker/Zed/ZedUi/FrontendBuilder';
const BUILDER_LADDER = '../../../../../../../..';
const BUILD_REFERENCE = `./${MONOREPO_BUILDER_DIRECTORY}/${BUILD_CONFIGURATION_FILE_NAME}`;
const PROJECT_BUILD_REFERENCE = `./${PROJECT_BUILDER_DIRECTORY}/${BUILD_CONFIGURATION_FILE_NAME}`;
const GENERATED_EXTENDS = [`./${DEFAULTS_CONFIGURATION_FILE_NAME}`, `${BUILDER_LADDER}/tsconfig.json`];
const temporaryRoots: string[] = [];

const reconcileFixture = (fixtureName: string): Promise<ReconciledTypeScriptConfiguration[]> =>
    reconcileTypeScriptConfigurations(resolveBuilderSettings(fixturePath(fixtureName)));

// A test that writes gets its own copy, so the committed fixture stays untouched.
const copyFixture = (fixtureName: string): string => {
    const root = mkdtempSync(join(tmpdir(), 'merchant-portal-tsconfig-'));
    temporaryRoots.push(root);
    cpSync(fixturePath(fixtureName), root, { recursive: true });

    return root;
};

const writeJson = (filePath: string, content: unknown): void => {
    writeFileSync(filePath, `${JSON.stringify(content, null, 4)}\n`);
};

afterEach(() => {
    while (temporaryRoots.length > 0) {
        rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
});

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

    it('includes the sources and application files of a project namespace registered in the settings', async () => {
        const settings = resolveBuilderSettings(fixturePath('configuration-project'), {
            paths: {
                projectModulesDirectories: { acme: './src/Acme/Zed' },
                projectApplicationDirectory: './src/Acme/Zed/ZedUi/Presentation/Components',
            },
        });
        const reconciledConfigurations = await reconcileTypeScriptConfigurations(settings);

        expect(configurationOf(reconciledConfigurations, LINT_CONFIGURATION_FILE_NAME).include).toEqual([
            '../../../../../../../../vendor/spryker/*/src/Spryker/Zed/*/Presentation/Components/*.ts',
            '../../../../../../../../src/Pyz/Zed/*/Presentation/Components/*.ts',
            '../../../../../../../../src/Acme/Zed/*/Presentation/Components/*.ts',
        ]);
        expect(configurationOf(reconciledConfigurations, BUILD_CONFIGURATION_FILE_NAME).include).toEqual([
            '../../../../../../../../src/Acme/Zed/ZedUi/Presentation/Components/main.ts',
            '../../../../../../../../src/Acme/Zed/ZedUi/Presentation/Components/polyfills.ts',
            '../../../../../../../../src/Acme/Zed/ZedUi/Presentation/Components/environments/environment.prod.ts',
            '../../../../../../../../vendor/spryker/*/src/Spryker/Zed/*/Presentation/Components/entry.ts',
            '../../../../../../../../src/Pyz/Zed/*/Presentation/Components/entry.ts',
            '../../../../../../../../src/Acme/Zed/*/Presentation/Components/entry.ts',
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
    });

    it('extends the builder defaults first and the project root last, so project options win', async () => {
        const buildConfiguration = configurationOf(
            await reconcileFixture('configuration-monorepo'),
            BUILD_CONFIGURATION_FILE_NAME,
        );

        expect(buildConfiguration.extends).toEqual(GENERATED_EXTENDS);
    });

    it('keeps only the generated paths inline, leaving every other compiler option to the defaults', async () => {
        const buildConfiguration = configurationOf(
            await reconcileFixture('configuration-monorepo'),
            BUILD_CONFIGURATION_FILE_NAME,
        );

        expect(Object.keys(buildConfiguration.compilerOptions!)).toEqual(['paths']);
    });

    it('climbs to the build configuration the project keeps in its root', async () => {
        const reconciledConfigurations = await reconcileFixture('configuration-existing');

        expect(configurationOf(reconciledConfigurations, LINT_CONFIGURATION_FILE_NAME).extends).toBe(
            `../../../../../../../../${BUILD_CONFIGURATION_FILE_NAME}`,
        );
    });

    it('explains which file is missing when no core module provides the polyfills', async () => {
        await expect(reconcileFixture('configuration-missing-polyfills')).rejects.toThrow(
            /mp\.polyfills\.ts.*configuration-missing-polyfills[\s\S]*discover it[\s\S]*update:config -w mp-zed-ui/,
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

    it('keeps what the copy in the project root extends', async () => {
        const buildConfiguration = configurationOf(
            await reconcileFixture('configuration-existing'),
            BUILD_CONFIGURATION_FILE_NAME,
        );

        expect(buildConfiguration.extends).toBe('./tsconfig.base.json');
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

describe('the builder-owned defaults', () => {
    it.each([
        ['configuration-monorepo', MONOREPO_BUILDER_DIRECTORY],
        ['configuration-project', PROJECT_BUILDER_DIRECTORY],
    ])('sits next to the build configuration of %s and climbs back to its root', async (fixtureName, directory) => {
        const context = fixturePath(fixtureName);

        const { filePath, configuration } = await reconcileDefaultsConfiguration(resolveBuilderSettings(context));

        expect(filePath).toBe(join(context, directory, DEFAULTS_CONFIGURATION_FILE_NAME));
        expect(configuration.compilerOptions?.rootDir).toBe(BUILDER_LADDER);
        expect(configuration.compilerOptions?.typeRoots).toEqual([`${BUILDER_LADDER}/node_modules/@types`]);
    });

    it('carries the Merchant Portal target and no paths', async () => {
        const { configuration } = await reconcileDefaultsConfiguration(
            resolveBuilderSettings(fixturePath('configuration-monorepo')),
        );

        expect(configuration.compilerOptions?.target).toBe('ES2022');
        expect(configuration.compilerOptions?.paths).toBeUndefined();
    });

    it('prefixes every exclude entry with the ladder, the unanchored ones included', async () => {
        const { configuration } = await reconcileDefaultsConfiguration(
            resolveBuilderSettings(fixturePath('configuration-monorepo')),
        );

        expect(configuration.exclude).toEqual([
            `${BUILDER_LADDER}/**/node_modules/**`,
            `${BUILDER_LADDER}/**/*.spec.ts`,
            `${BUILDER_LADDER}/**/*.test.ts`,
            `${BUILDER_LADDER}/public`,
            `${BUILDER_LADDER}/dist`,
            `${BUILDER_LADDER}/**/dist/**`,
        ]);
    });
});

describe('an existing build configuration', () => {
    it('gets the generated extends list on every run and keeps every compiler option', async () => {
        const context = copyFixture('configuration-monorepo');
        writeJson(join(context, MONOREPO_BUILDER_DIRECTORY, BUILD_CONFIGURATION_FILE_NAME), {
            extends: `${BUILDER_LADDER}/tsconfig.json`,
            compilerOptions: { target: 'ES2022', noUnusedLocals: true, paths: {} },
            include: [],
            angularCompilerOptions: { strictTemplates: false },
        });

        const buildConfiguration = configurationOf(
            await reconcileTypeScriptConfigurations(resolveBuilderSettings(context)),
            BUILD_CONFIGURATION_FILE_NAME,
        );

        expect(buildConfiguration.extends).toEqual(GENERATED_EXTENDS);
        expect(Object.keys(buildConfiguration.compilerOptions!)).toEqual(['target', 'noUnusedLocals', 'paths']);
        expect(buildConfiguration.angularCompilerOptions).toEqual({ strictTemplates: false });
    });
});

describe('the project root solution file', () => {
    it('is created with a reference to the build configuration when the root has no tsconfig.json', async () => {
        const reconciliation = await reconcileProjectSolution(
            resolveBuilderSettings(fixturePath('configuration-project')),
        );

        expect(reconciliation).toMatchObject({
            status: 'created',
            configuration: { files: [], references: [{ path: PROJECT_BUILD_REFERENCE }] },
        });
    });

    it('replaces, in place, the reference the other source layout wrote', async () => {
        const context = copyFixture('configuration-monorepo');
        writeJson(join(context, 'tsconfig.json'), {
            files: [],
            references: [{ path: PROJECT_BUILD_REFERENCE }, { path: './other/tsconfig.json' }],
        });

        const reconciliation = await reconcileProjectSolution(resolveBuilderSettings(context));

        expect(reconciliation).toMatchObject({
            status: 'updated',
            configuration: { references: [{ path: BUILD_REFERENCE }, { path: './other/tsconfig.json' }] },
        });
    });

    it('adds the reference once and reports no change when it is already there', async () => {
        const context = copyFixture('configuration-monorepo');
        writeJson(join(context, 'tsconfig.json'), { files: [], references: [{ path: './other/tsconfig.json' }] });

        const firstReconciliation = await reconcileProjectSolution(resolveBuilderSettings(context));

        expect(firstReconciliation).toMatchObject({
            configuration: { references: [{ path: './other/tsconfig.json' }, { path: BUILD_REFERENCE }] },
        });
        writeJson(join(context, 'tsconfig.json'), (firstReconciliation as { configuration: unknown }).configuration);
        expect((await reconcileProjectSolution(resolveBuilderSettings(context))).status).toBe('unchanged');
    });

    it('leaves a complete root configuration byte-identical and says how to add the reference', async () => {
        const context = copyFixture('configuration-monorepo');
        const rootConfiguration = '{\n  "compilerOptions": { "strict": true },\n  "include": ["src"]\n}\n';
        writeFileSync(join(context, 'tsconfig.json'), rootConfiguration);
        const settings = resolveBuilderSettings(context);
        const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

        applySolutionReconciliation(settings, await reconcileProjectSolution(settings));

        expect(readFileSync(join(context, 'tsconfig.json'), 'utf8')).toBe(rootConfiguration);
        expect(String(log.mock.calls[0][0])).toContain(join(context, 'tsconfig.json'));
        expect(String(log.mock.calls[0][0])).toContain('complete TypeScript configuration');
        expect(String(log.mock.calls[0][0])).toContain(BUILD_REFERENCE);
        log.mockRestore();
    });
});
