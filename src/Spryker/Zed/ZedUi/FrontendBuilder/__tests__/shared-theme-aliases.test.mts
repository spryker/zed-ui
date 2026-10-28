import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from '@jest/globals';
import type { Configuration, LoaderContext } from 'webpack';
import { BUILD_CONFIGURATION_PATH, getSourceRoots, resolveBuilderSettings } from '../settings.mts';
import { buildSharedThemePathAliases } from '../libs/shared-theme-aliases.mts';
import { mergeModulePathAliases } from '../libs/module-path-aliases.mts';
import { BUILD_CONFIGURATION_FILE_NAME, reconcileTypeScriptConfigurations } from '../libs/typescript-configuration.mts';
import { applySharedThemeSupport, buildSharedThemeWebpackAliases } from '../libs/shared-theme-webpack.mts';
import { pitch } from '../libs/style-injection-loader.mts';
import { fixturePath } from './helpers/fixtures.mts';

const CORE_THEME = 'src/SprykerFeature/AiCommerce/src/SprykerFeature/Shared/AiCommerce/Theme/default';
const SPRYKER_THEME = 'src/Spryker/AiCommerce/src/Spryker/Shared/AiCommerce/Theme/default';
const ACME_THEME = 'src/Acme/AiCommerce/src/Acme/Shared/AiCommerce/Theme/default';
const PYZ_THEME = 'src/Pyz/Shared/AiCommerce/Theme/default';
const BUILDER_LADDER = '../../../../../../../..';
const temporaryRoots: string[] = [];

// The monorepo fixture plus a generated build configuration and the Shared theme directories a case needs.
const createContext = (projectNamespaces: string[], themeDirectories: string[]): string => {
    const context = mkdtempSync(join(tmpdir(), 'mp-shared-theme-'));
    temporaryRoots.push(context);
    cpSync(fixturePath('configuration-monorepo'), context, { recursive: true });

    const buildConfigurationPath = join(context, BUILD_CONFIGURATION_PATH);
    mkdirSync(dirname(buildConfigurationPath), { recursive: true });
    writeFileSync(
        buildConfigurationPath,
        JSON.stringify({ coreNamespaces: ['SprykerFeature', 'Spryker'], projectNamespaces }),
    );

    themeDirectories.forEach((themeDirectory) => {
        mkdirSync(join(context, themeDirectory, 'Chat'), { recursive: true });
        writeFileSync(join(context, themeDirectory, 'Chat', 'index.ts'), 'export {};\n');
    });

    return context;
};

const collectAliases = (context: string) =>
    buildSharedThemePathAliases(getSourceRoots(resolveBuilderSettings(context)));

afterEach(() => {
    while (temporaryRoots.length > 0) {
        rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
});

describe('the @shared aliases of the Merchant Portal build', () => {
    it('points the alias at the core Shared theme when no project shadows the module', async () => {
        const aliases = await collectAliases(createContext(['Pyz'], [CORE_THEME]));

        expect(aliases).toEqual({ '@shared/ai-commerce/*': [`./${CORE_THEME}/*`] });
    });

    it('puts a project namespace other than Pyz before the core directory', async () => {
        const aliases = await collectAliases(createContext(['Acme'], [CORE_THEME, ACME_THEME]));

        expect(aliases['@shared/ai-commerce/*']).toEqual([`./${ACME_THEME}/*`, `./${CORE_THEME}/*`]);
    });

    it('orders two project namespaces as the backend lists them, strongest first', async () => {
        const aliases = await collectAliases(createContext(['Acme', 'Pyz'], [CORE_THEME, PYZ_THEME, ACME_THEME]));

        expect(aliases['@shared/ai-commerce/*']).toEqual([
            `./${ACME_THEME}/*`,
            `./${PYZ_THEME}/*`,
            `./${CORE_THEME}/*`,
        ]);
    });

    it('names both directories when a module ships a Shared theme in two core namespaces', async () => {
        const context = createContext(['Pyz'], [CORE_THEME, SPRYKER_THEME]);

        await expect(collectAliases(context)).rejects.toThrow(
            new RegExp(`module "AiCommerce" exists in two core source roots: .*${SPRYKER_THEME}.*${CORE_THEME}`),
        );
        await expect(collectAliases(context)).rejects.toThrow(/KernelConstants::PROJECT_NAMESPACES/);
    });
});

describe('the @shared aliases in the build TypeScript configuration', () => {
    const reconcileBuildConfiguration = async (context: string) =>
        (await reconcileTypeScriptConfigurations(resolveBuilderSettings(context))).find(
            ({ fileName }) => fileName === BUILD_CONFIGURATION_FILE_NAME,
        )!.configuration;

    it('writes the alias relative to the builder, project first', async () => {
        const configuration = await reconcileBuildConfiguration(createContext(['Pyz'], [CORE_THEME, PYZ_THEME]));

        expect(configuration.compilerOptions?.paths?.['@shared/ai-commerce/*']).toEqual([
            `${BUILDER_LADDER}/${PYZ_THEME}/*`,
            `${BUILDER_LADDER}/${CORE_THEME}/*`,
        ]);
    });

    it('lists the sources of every Shared theme an alias points at, because Angular compiles only listed files', async () => {
        const configuration = await reconcileBuildConfiguration(createContext(['Pyz'], [CORE_THEME, PYZ_THEME]));

        expect(configuration.include).toEqual(
            expect.arrayContaining([
                `${BUILDER_LADDER}/${PYZ_THEME}/**/*.ts`,
                `${BUILDER_LADDER}/${CORE_THEME}/**/*.ts`,
            ]),
        );
    });

    it('lists the stylesheet declarations, so a Shared theme can import its stylesheet', async () => {
        const configuration = await reconcileBuildConfiguration(createContext(['Pyz'], [CORE_THEME]));

        expect(configuration.include).toContain(
            `${BUILDER_LADDER}/src/Spryker/ZedUi/src/Spryker/Zed/ZedUi/FrontendBuilder/types/*.d.ts`,
        );
    });

    it('drops the alias of a Shared theme that is gone and keeps an alias the project wrote', () => {
        const merged = mergeModulePathAliases(
            {
                '@shared/removed-module/*': [`${BUILDER_LADDER}/src/Pyz/Shared/RemovedModule/Theme/default/*`],
                '@shared/project-tools/*': [`${BUILDER_LADDER}/frontend/shared-tools/*`],
            },
            {},
            ['./src/Spryker', './src/Pyz/Zed'],
        );

        expect(merged).toEqual({ '@shared/project-tools/*': [`${BUILDER_LADDER}/frontend/shared-tools/*`] });
    });
});

describe('the @shared support in the Merchant Portal webpack configuration', () => {
    it('gives Sass every alias target as an absolute directory, project first', () => {
        expect(
            buildSharedThemeWebpackAliases('/project', {
                '@shared/ai-commerce/*': [`./${PYZ_THEME}/*`, `./${CORE_THEME}/*`],
            }),
        ).toEqual({ '@shared/ai-commerce': [`/project/${PYZ_THEME}`, `/project/${CORE_THEME}`] });
    });

    it('puts the imported-stylesheet rule before the rules Angular adds, so its loaders run last', () => {
        const angularRule = { test: /\.scss$/i };
        const config: Configuration = { module: { rules: [angularRule] } };

        applySharedThemeSupport(config, '/project', {});

        expect(config.module?.rules?.[1]).toBe(angularRule);
        expect(config.module?.rules?.[0]).toMatchObject({ test: /\.scss$/i, issuer: /\.ts$/i });
    });

    it('keeps the aliases set before it', () => {
        const config: Configuration = { resolve: { alias: { '~@spryker': '/project/node_modules/@spryker' } } };

        applySharedThemeSupport(config, '/project', { '@shared/ai-commerce/*': [`./${CORE_THEME}/*`] });

        expect(config.resolve?.alias).toEqual({
            '~@spryker': '/project/node_modules/@spryker',
            '@shared/ai-commerce': [`/project/${CORE_THEME}`],
        });
    });

    it('appends the stylesheet to the document from the module that imported it', () => {
        const loaderContext = {
            context: '/project/src',
            utils: { contextify: (_context: string, request: string) => request.replace('/project/src', '.') },
        } as unknown as LoaderContext<Record<string, never>>;

        const code = pitch.call(loaderContext, '/project/node_modules/css-loader/index.js!/project/src/chat.scss');

        expect(code).toContain('import css from "!!/project/node_modules/css-loader/index.js!./chat.scss";');
        expect(code).toContain('document.head.appendChild(style);');
    });
});
