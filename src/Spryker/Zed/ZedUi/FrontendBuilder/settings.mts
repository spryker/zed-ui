import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';

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

export interface MerchantPortalSourceLayout {
    name: string;
    marker: string;
    ownsCoreModules: boolean;
    coreModulesDirectory: string;
    projectModulesDirectory: string;
    // The Angular application entry files live in the project's own ZedUi module, whose path follows
    // the same layout as the other project modules.
    projectApplicationDirectory: string;
}

export interface MerchantPortalBuilderSettings {
    context: string;
    layout: MerchantPortalSourceLayout;
    paths: {
        coreModulesDirectory: string;
        projectModulesDirectory: string;
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
}

const monorepoSourceLayout: MerchantPortalSourceLayout = {
    name: 'monorepo (modules in src/)',
    marker: 'src/Spryker',
    ownsCoreModules: true,
    coreModulesDirectory: './src/Spryker',
    projectModulesDirectory: './src/Pyz/*/src/Pyz/Zed',
    projectApplicationDirectory: './src/Pyz/ZedUi/src/Pyz/Zed/ZedUi/Presentation/Components',
};

const projectSourceLayout: MerchantPortalSourceLayout = {
    name: 'project (modules in vendor/)',
    marker: 'vendor/spryker',
    ownsCoreModules: false,
    coreModulesDirectory: './vendor/spryker',
    // A project keeps its Zed modules directly under src/Pyz/Zed, not in the per-module split the
    // monorepo uses.
    projectModulesDirectory: './src/Pyz/Zed',
    projectApplicationDirectory: './src/Pyz/Zed/ZedUi/Presentation/Components',
};

export const merchantPortalSourceLayouts: MerchantPortalSourceLayout[] = [monorepoSourceLayout, projectSourceLayout];

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
            `dependencies first if vendor/ is missing.\n`,
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

export const resolveBuilderSettings = (explicitContext?: string): MerchantPortalBuilderSettings => {
    const context = explicitContext ?? resolveProjectRoot();
    const layout = resolveSourceLayout(context);

    return {
        context,
        layout,
        paths: {
            coreModulesDirectory: join(context, layout.coreModulesDirectory),
            projectModulesDirectory: join(context, layout.projectModulesDirectory),
            sprykerPackagesDirectory: join(context, 'node_modules', '@spryker'),
            angularPackagesDirectory: join(context, 'node_modules', '@angular'),
            outputDirectory: join(context, 'public', 'MerchantPortal', 'assets', 'js'),
        },
        globs: {
            coreEntryPointFile: '*/src/Spryker/Zed/*/Presentation/Components/entry.ts',
            projectEntryPointFile: '*/Presentation/Components/entry.ts',
            coreSourceFiles: '*/src/Spryker/Zed/*/Presentation/Components/*.ts',
            projectSourceFiles: '*/Presentation/Components/*.ts',
            coreSpecFiles: '*/src/Spryker/Zed/*/Presentation/Components/**/*.spec.ts',
            coreAssetFiles: '*/src/Spryker/Zed/*/Presentation/Components/assets/**/*',
            coreStaticFiles: '*/data/files/**/*',
            projectSpecFiles: '*/Presentation/Components/**/*.spec.ts',
            coreStyleSheetFiles: '*/src/Spryker/Zed/*/Presentation/Components/**/*.less',
            projectStyleSheetFiles: '*/Presentation/Components/**/*.less',
        },
        urls: {
            assetsPublicPath: '/assets/js/',
        },
    };
};
