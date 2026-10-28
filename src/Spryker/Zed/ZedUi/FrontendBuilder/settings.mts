import { dirname, join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { SourceRoots } from './libs/shared-theme-aliases.mts';

export const SINGLE_ENTRY_POINT_NAME = 'spy/merchant-portal';
export const SINGLE_ENTRY_POINT_MARKER = `${SINGLE_ENTRY_POINT_NAME}:single-entry-marker`;

export const ENTRY_POINT_NAME_PREFIX = 'spy/';
export const MODULE_PATH_ALIAS_PREFIX = '@mp/';

export const PUBLIC_API_FILE_NAME = 'mp.public-api.ts';

export const POLYFILLS_PATH_ALIAS_NAME = `${MODULE_PATH_ALIAS_PREFIX}polyfills`;

// Both files live inside the ZedUi module, but the directory that module is installed into differs
// per layout (`src/Spryker/ZedUi` in the monorepo, `vendor/spryker/zed-ui` in a project), so the
// builder discovers the directory instead of assuming its name.
export const POLYFILLS_MODULE_RELATIVE_PATH = 'src/Spryker/Zed/ZedUi/Presentation/Components/mp.polyfills.ts';
export const BUILDER_MODULE_RELATIVE_DIRECTORY = 'src/Spryker/Zed/ZedUi/FrontendBuilder';
export const TEST_SETUP_MODULE_RELATIVE_PATH = `${BUILDER_MODULE_RELATIVE_DIRECTORY}/test-setup.ts`;
export const WEBPACK_CONFIG_MODULE_RELATIVE_PATH = `${BUILDER_MODULE_RELATIVE_DIRECTORY}/webpack.config.mts`;
export const INDEX_TRANSFORM_MODULE_RELATIVE_PATH = `${BUILDER_MODULE_RELATIVE_DIRECTORY}/libs/index-transform.mts`;
export const JEST_CONFIG_MODULE_RELATIVE_PATH = `${BUILDER_MODULE_RELATIVE_DIRECTORY}/jest.config.mjs`;
export const CORE_STYLES_MODULE_RELATIVE_PATH = 'src/Spryker/Zed/ZedUi/Presentation/Components/styles.less';

// Optional project override file; the builder loads it when it exists and uses the defaults otherwise.
export const PROJECT_SETTINGS_RELATIVE_PATH = 'frontend/merchant-portal.settings.mts';

export interface MerchantPortalSourceLayout {
    name: string;
    marker: string;
    ownsCoreModules: boolean;
    /** The root of the namespace that ships ZedUi: its polyfills, stylesheet, builder and test setup are found below it. */
    coreModulesDirectory: string;
    /** Every core namespace root, weakest first; all of them are scanned for Merchant Portal modules. */
    coreModulesDirectories: Record<string, string>;
    // Keyed so a project can register a further namespace next to the default one instead of
    // replacing it; the values are project-root-relative directory patterns holding Zed modules.
    projectModulesDirectories: Record<string, string>;
    // The Angular application entry files live in the project's own ZedUi module, whose path follows
    // the same layout as the other project modules.
    projectApplicationDirectory: string;
}

export interface MerchantPortalBuilderSettings {
    context: string;
    layout: MerchantPortalSourceLayout;
    paths: {
        coreModulesDirectory: string;
        coreModulesDirectories: string[];
        projectModulesDirectories: string[];
        sprykerPackagesDirectory: string;
        angularPackagesDirectory: string;
        outputDirectory: string;
    };
    globs: {
        coreEntryPointFile: string;
        projectEntryPointFile: string;
        coreSourceFiles: string;
        projectSourceFiles: string;
        coreSpecFiles: string;
        coreAssetFiles: string;
        coreStaticFiles: string;
        projectSpecFiles: string;
        coreStyleSheetFiles: string;
        projectStyleSheetFiles: string;
    };
    urls: {
        assetsPublicPath: string;
    };
    buildConfigurationSource: string;
}

// Written by the backend before every build; without it the built-in layout stays in effect.
export const BUILD_CONFIGURATION_PATH = 'data/cache/MerchantPortal/frontend/build-config.json';

export interface GeneratedBuildConfiguration {
    /** Strongest first. */
    coreNamespaces: string[];
    projectNamespaces: string[];
}

export const readGeneratedBuildConfiguration = (context: string): GeneratedBuildConfiguration | null => {
    const filePath = join(context, BUILD_CONFIGURATION_PATH);

    if (!existsSync(filePath)) {
        return null;
    }

    const parsed: Partial<GeneratedBuildConfiguration> = JSON.parse(readFileSync(filePath, 'utf8'));

    if (!Array.isArray(parsed.coreNamespaces) || !Array.isArray(parsed.projectNamespaces)) {
        throw new Error(
            `${filePath}: "coreNamespaces" and "projectNamespaces" must be lists of namespace names; ` +
                `regenerate the file with "vendor/bin/console frontend:mp:build".`,
        );
    }

    return parsed as GeneratedBuildConfiguration;
};

const dasherize = (value: string): string => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

// `src/<Namespace>` when the repository holds the modules, the Composer package directory otherwise.
const resolveNamespaceDirectory = (context: string, namespace: string): string =>
    existsSync(join(context, 'src', namespace)) ? `./src/${namespace}` : `./vendor/${dasherize(namespace)}`;

const ZED_UI_HOME_NAMESPACE = 'Spryker';
const APPLICATION_MODULE_RELATIVE_DIRECTORY = 'ZedUi/Presentation/Components';

// A later directory wins, the backend lists the strongest namespace first: the list is reversed. A project
// root is emitted in both layout shapes (split per module and flat); an empty shape matches nothing.
const applyGeneratedBuildConfiguration = (
    context: string,
    layout: MerchantPortalSourceLayout,
    generated: GeneratedBuildConfiguration,
): MerchantPortalSourceLayout => {
    if (!generated.coreNamespaces.includes(ZED_UI_HOME_NAMESPACE)) {
        throw new Error(
            `The Merchant Portal build configuration ${join(context, BUILD_CONFIGURATION_PATH)} lists no ` +
                `"${ZED_UI_HOME_NAMESPACE}" core namespace, so the ZedUi module that ships the builder cannot be located.\n` +
                `The backend generates this file before the build; fix the generator or the core namespaces.\n`,
        );
    }

    const coreModulesDirectory = resolveNamespaceDirectory(context, ZED_UI_HOME_NAMESPACE);
    const coreModulesDirectories = Object.fromEntries(
        [...generated.coreNamespaces]
            .reverse()
            .map((namespace) => [namespace.toLowerCase(), resolveNamespaceDirectory(context, namespace)]),
    );
    const projectModulesDirectories: Record<string, string> = {};
    [...generated.projectNamespaces].reverse().forEach((namespace) => {
        const key = namespace.toLowerCase();
        projectModulesDirectories[`${key}/Zed`] = `${resolveNamespaceDirectory(context, namespace)}/Zed`;
        projectModulesDirectories[key] = `${resolveNamespaceDirectory(context, namespace)}/*/src/${namespace}/Zed`;
    });

    const applicationDirectory = generated.projectNamespaces
        .flatMap((namespace) => [
            `${resolveNamespaceDirectory(context, namespace)}/ZedUi/src/${namespace}/Zed/${APPLICATION_MODULE_RELATIVE_DIRECTORY}`,
            `${resolveNamespaceDirectory(context, namespace)}/Zed/${APPLICATION_MODULE_RELATIVE_DIRECTORY}`,
        ])
        .find((candidate) => existsSync(join(context, candidate)));

    return {
        ...layout,
        ownsCoreModules: coreModulesDirectory.startsWith('./src/'),
        coreModulesDirectory,
        coreModulesDirectories,
        projectModulesDirectories,
        projectApplicationDirectory: applicationDirectory ?? layout.projectApplicationDirectory,
    };
};

const monorepoSourceLayout: MerchantPortalSourceLayout = {
    name: 'monorepo (modules in src/)',
    marker: 'src/Spryker',
    ownsCoreModules: true,
    coreModulesDirectory: './src/Spryker',
    coreModulesDirectories: { spryker: './src/Spryker' },
    projectModulesDirectories: { pyz: './src/Pyz/*/src/Pyz/Zed' },
    projectApplicationDirectory: './src/Pyz/ZedUi/src/Pyz/Zed/ZedUi/Presentation/Components',
};

const projectSourceLayout: MerchantPortalSourceLayout = {
    name: 'project (modules in vendor/)',
    marker: 'vendor/spryker',
    ownsCoreModules: false,
    coreModulesDirectory: './vendor/spryker',
    coreModulesDirectories: { spryker: './vendor/spryker' },
    // A project keeps its Zed modules directly under src/Pyz/Zed, not in the per-module split the
    // monorepo uses.
    projectModulesDirectories: { pyz: './src/Pyz/Zed' },
    projectApplicationDirectory: './src/Pyz/Zed/ZedUi/Presentation/Components',
};

export const merchantPortalSourceLayouts: MerchantPortalSourceLayout[] = [monorepoSourceLayout, projectSourceLayout];

// The layout lists every directory weakest first, a later one wins; the alias targets want the strongest first.
export const getSourceRoots = (settings: MerchantPortalBuilderSettings): SourceRoots => ({
    context: settings.context,
    core: Object.values(settings.layout.coreModulesDirectories),
    project: Object.values(settings.layout.projectModulesDirectories).reverse(),
});

export const resolveSourceLayout = (context: string = process.cwd()): MerchantPortalSourceLayout => {
    if (existsSync(join(context, monorepoSourceLayout.marker))) {
        return monorepoSourceLayout;
    }

    if (existsSync(join(context, projectSourceLayout.marker))) {
        return projectSourceLayout;
    }

    throw new Error(
        `Cannot determine the Merchant Portal source layout for ${context}: neither ` +
            `"${monorepoSourceLayout.marker}" (${monorepoSourceLayout.name}) nor ` +
            `"${projectSourceLayout.marker}" (${projectSourceLayout.name}) exists there.\n` +
            `The builder resolves every module path relative to the current working directory, so it ` +
            `must run from the project root.\n` +
            `Run "ng build"/"npm run mp:*" from the project root, and install the composer ` +
            `dependencies first if vendor/ is missing. A project whose modules live outside src/Pyz ` +
            `registers them in ./${PROJECT_SETTINGS_RELATIVE_PATH} via ` +
            `defineConfig({ paths: { projectModulesDirectories: { … } } }).\n`,
    );
};

export const resolveProjectRoot = (startDirectory: string = process.cwd()): string => {
    let currentDirectory = resolve(startDirectory);

    for (;;) {
        if (existsSync(join(currentDirectory, 'package-lock.json'))) {
            return currentDirectory;
        }

        const parentDirectory = dirname(currentDirectory);

        if (parentDirectory === currentDirectory) {
            throw new Error(
                `Cannot locate the Merchant Portal project root above ${resolve(startDirectory)}: no ` +
                    `ancestor directory contains a "package-lock.json".\n` +
                    `The builder resolves every module path from the project root, which it finds by ` +
                    `walking up from the working directory.\n` +
                    `Run the command from inside the project, and run "npm install" first if the ` +
                    `lockfile is missing.\n`,
            );
        }

        currentDirectory = parentDirectory;
    }
};

export interface DefineConfigOverrides {
    paths?: {
        // Merged over the detected layout's directories, so the default namespace stays registered.
        projectModulesDirectories?: Record<string, string>;
        projectApplicationDirectory?: string;
    };
}

const applyLayoutOverrides = (
    layout: MerchantPortalSourceLayout,
    overrides: DefineConfigOverrides,
): MerchantPortalSourceLayout => ({
    ...layout,
    projectModulesDirectories: {
        ...layout.projectModulesDirectories,
        ...(overrides.paths?.projectModulesDirectories ?? {}),
    },
    projectApplicationDirectory: overrides.paths?.projectApplicationDirectory ?? layout.projectApplicationDirectory,
});

export const resolveBuilderSettings = (
    explicitContext?: string,
    overrides: DefineConfigOverrides = {},
): MerchantPortalBuilderSettings => {
    const context = explicitContext ?? resolveProjectRoot();
    const generated = readGeneratedBuildConfiguration(context);
    const detectedLayout = resolveSourceLayout(context);
    const layout = applyLayoutOverrides(
        generated === null ? detectedLayout : applyGeneratedBuildConfiguration(context, detectedLayout, generated),
        overrides,
    );

    return {
        context,
        layout,
        paths: {
            coreModulesDirectory: join(context, layout.coreModulesDirectory),
            coreModulesDirectories: Object.values(layout.coreModulesDirectories).map((directory) =>
                join(context, directory),
            ),
            projectModulesDirectories: Object.values(layout.projectModulesDirectories).map((directory) =>
                join(context, directory),
            ),
            sprykerPackagesDirectory: join(context, 'node_modules', '@spryker'),
            angularPackagesDirectory: join(context, 'node_modules', '@angular'),
            outputDirectory: join(context, 'public', 'MerchantPortal', 'assets', 'js'),
        },
        globs: {
            // `*/src/*/Zed`: one package per core root, whatever namespace the root belongs to.
            coreEntryPointFile: '*/src/*/Zed/*/Presentation/Components/entry.ts',
            projectEntryPointFile: '*/Presentation/Components/entry.ts',
            coreSourceFiles: '*/src/*/Zed/*/Presentation/Components/*.ts',
            projectSourceFiles: '*/Presentation/Components/*.ts',
            coreSpecFiles: '*/src/*/Zed/*/Presentation/Components/**/*.spec.ts',
            coreAssetFiles: '*/src/*/Zed/*/Presentation/Components/assets/**/*',
            coreStaticFiles: '*/data/files/**/*',
            projectSpecFiles: '*/Presentation/Components/**/*.spec.ts',
            coreStyleSheetFiles: '*/src/*/Zed/*/Presentation/Components/**/*.less',
            projectStyleSheetFiles: '*/Presentation/Components/**/*.less',
        },
        urls: {
            assetsPublicPath: '/assets/js/',
        },
        buildConfigurationSource:
            generated === null
                ? `built-in defaults (no ${BUILD_CONFIGURATION_PATH}; the backend generates it)`
                : `generated (${join(context, BUILD_CONFIGURATION_PATH)})`,
    };
};

/** What `frontend/merchant-portal.settings.mts` exports: the packaged defaults with the project's overrides merged in. */
export const defineConfig = (overrides: DefineConfigOverrides = {}): MerchantPortalBuilderSettings =>
    resolveBuilderSettings(undefined, overrides);

const isBuilderSettings = (candidate: unknown): candidate is MerchantPortalBuilderSettings =>
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof (candidate as MerchantPortalBuilderSettings).context === 'string' &&
    typeof (candidate as MerchantPortalBuilderSettings).layout === 'object' &&
    typeof (candidate as MerchantPortalBuilderSettings).paths === 'object';

export const loadProjectBuilderSettings = async (explicitContext?: string): Promise<MerchantPortalBuilderSettings> => {
    const context = explicitContext ?? resolveProjectRoot();
    const projectOverridePath = join(context, PROJECT_SETTINGS_RELATIVE_PATH);

    if (!existsSync(projectOverridePath)) {
        return resolveBuilderSettings(context);
    }

    let projectSettings: unknown;

    try {
        ({ default: projectSettings } = await import(pathToFileURL(projectOverridePath).href));
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);

        throw new Error(
            `Failed to load the project builder settings from ${projectOverridePath}: ${reason}.\n` +
                `Node runs this file directly via TypeScript type stripping, so it must use only erasable ` +
                `TypeScript syntax — no enum, no namespace, no constructor parameter properties (they fail ` +
                `at runtime).\n` +
                `Use only erasable TypeScript syntax, or check the file for syntax errors.\n`,
        );
    }

    if (!isBuilderSettings(projectSettings)) {
        throw new Error(
            `The project builder settings at ${projectOverridePath} do not export builder settings as their ` +
                `default export.\n` +
                `The Merchant Portal builder reads its layout and paths from that export, so the file has to ` +
                `hand back what defineConfig() returns.\n` +
                `Export "defineConfig({ … })" from the ZedUi FrontendBuilder settings.mts as the default export.\n`,
        );
    }

    return projectSettings;
};
