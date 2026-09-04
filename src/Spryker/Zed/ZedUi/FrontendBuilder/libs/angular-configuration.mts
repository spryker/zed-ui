import { join, relative, sep } from 'node:path';
import {
    CORE_STYLES_MODULE_RELATIVE_PATH,
    INDEX_TRANSFORM_MODULE_RELATIVE_PATH,
    JEST_CONFIG_MODULE_RELATIVE_PATH,
    WEBPACK_CONFIG_MODULE_RELATIVE_PATH,
    merchantPortalSourceLayouts,
    type MerchantPortalBuilderSettings,
} from '../settings.mts';
import {
    matchesAnyPathTemplate,
    readConfigurationFile,
    reconcileEntryList,
    type ReconciledConfiguration,
} from './configuration-file.mts';
import { joinConfigurationPath, resolveCoreModuleFilePath } from './utils.mts';

export const ANGULAR_CONFIGURATION_FILE_NAME = 'angular.json';
export const MERCHANT_PORTAL_PROJECT_NAME = 'merchant-portal';

export interface AngularAsset {
    glob: string;
    input: string;
    output: string;
}

interface AngularBuildOptions extends Record<string, unknown> {
    customWebpackConfig?: Record<string, unknown> & { path?: string };
    indexTransform?: string;
    outputPath?: string;
    baseHref?: string;
    tsConfig?: string;
    assets?: AngularAsset[];
    styles?: string[];
}

interface AngularTestOptions extends Record<string, unknown> {
    tsConfig?: string;
    config?: string;
    configPath?: string;
    zoneless?: boolean;
}

interface AngularProject extends Record<string, unknown> {
    architect?: {
        build?: { options?: AngularBuildOptions } & Record<string, unknown>;
        test?: { options?: AngularTestOptions } & Record<string, unknown>;
    } & Record<string, unknown>;
}

export interface AngularConfiguration extends Record<string, unknown> {
    projects?: Record<string, AngularProject>;
}

export type ReconciledAngularConfiguration = ReconciledConfiguration<AngularConfiguration>;

const toPosixPath = (filePath: string): string => filePath.split(sep).join('/');

// The Angular CLI resolves an "architect" project by name, so the project has to be found before its
// builder-owned options can be rewritten. A single-project file is unambiguous whatever it is called.
const resolveMerchantPortalProject = (configuration: AngularConfiguration): AngularProject => {
    const projects = configuration.projects ?? {};
    const projectNames = Object.keys(projects);
    const merchantPortalProject = projects[MERCHANT_PORTAL_PROJECT_NAME];

    if (merchantPortalProject !== undefined) {
        return merchantPortalProject;
    }

    if (projectNames.length === 1) {
        return projects[projectNames[0]];
    }

    throw new Error(
        `Cannot find the Merchant Portal project in ${ANGULAR_CONFIGURATION_FILE_NAME}: it declares ` +
            `${projectNames.length === 0 ? 'no projects' : `the projects ${projectNames.join(', ')}`}, and none ` +
            `of them is called "${MERCHANT_PORTAL_PROJECT_NAME}".\n` +
            `The builder rewrites the paths it owns inside that project, so it has to know which one it is.\n` +
            `Rename your Merchant Portal project to "${MERCHANT_PORTAL_PROJECT_NAME}", or remove the ` +
            `unrelated projects from ${ANGULAR_CONFIGURATION_FILE_NAME}, then re-run ` +
            `"npm run mp:update:config".\n`,
    );
};

const buildDefaultAngularConfiguration = (): AngularConfiguration => ({
    $schema: './node_modules/@angular/cli/lib/config/schema.json',
    version: 1,
    newProjectRoot: 'src',
    projects: {
        [MERCHANT_PORTAL_PROJECT_NAME]: {
            projectType: 'application',
            schematics: {},
            root: '',
            sourceRoot: 'src',
            prefix: 'mp',
            architect: {
                build: {
                    builder: '@angular-builders/custom-webpack:browser',
                    // Declared empty so a newly created file gets the builder-owned options in place
                    // rather than appended after the project-owned ones.
                    options: {
                        customWebpackConfig: { path: '', mergeRules: {} },
                        indexTransform: '',
                        outputPath: '',
                        baseHref: '',
                        index: 'src/Pyz/ZedUi/src/Pyz/Zed/ZedUi/Presentation/Components/index.html',
                        main: 'src/Pyz/ZedUi/src/Pyz/Zed/ZedUi/Presentation/Components/main.ts',
                        polyfills: 'src/Pyz/ZedUi/src/Pyz/Zed/ZedUi/Presentation/Components/polyfills.ts',
                        tsConfig: '',
                        assets: [
                            {
                                glob: '*/Presentation/Components/assets/**/*',
                                input: 'src/Pyz/*/src/Pyz/Zed',
                                output: '/assets/',
                            },
                            {
                                glob: '*/data/files/**/*',
                                input: 'src/Pyz/*/src/Pyz/Zed',
                                output: '/static/',
                            },
                        ],
                        styles: ['src/Pyz/ZedUi/src/Pyz/Zed/ZedUi/Presentation/Components/styles.less'],
                        scripts: [],
                    },
                    configurations: {
                        development: {
                            buildOptimizer: false,
                            optimization: false,
                            vendorChunk: true,
                            extractLicenses: false,
                            sourceMap: true,
                            namedChunks: true,
                        },
                        production: {
                            fileReplacements: [
                                {
                                    replace:
                                        'src/Pyz/ZedUi/src/Pyz/Zed/ZedUi/Presentation/Components/environments/environment.ts',
                                    with: 'src/Pyz/ZedUi/src/Pyz/Zed/ZedUi/Presentation/Components/environments/environment.prod.ts',
                                },
                            ],
                            optimization: { scripts: true, styles: { minify: true, inlineCritical: false } },
                            outputHashing: 'none',
                            sourceMap: false,
                            namedChunks: false,
                            extractLicenses: true,
                            vendorChunk: true,
                            buildOptimizer: true,
                            budgets: [{ type: 'bundle', maximumWarning: '2mb', maximumError: '5mb' }],
                        },
                    },
                    defaultConfiguration: 'development',
                },
                test: {
                    builder: '@angular-builders/jest:run',
                    options: {},
                },
            },
        },
    },
    cli: { analytics: false },
});

const isCoreInput = (assetInput: string): boolean =>
    merchantPortalSourceLayouts.some(
        (layout) => joinConfigurationPath(assetInput) === joinConfigurationPath(layout.coreModulesDirectory),
    );

// @angular-builders/jest renamed `configPath` to `config` and introduced `zoneless` in 22.
const CURRENT_JEST_BUILDER_MAJOR_VERSION = 22;
const JEST_BUILDER_PACKAGE_PATH = 'node_modules/@angular-builders/jest/package.json';

const resolveJestBuilderMajorVersion = (context: string): number => {
    const builderManifest = readConfigurationFile<{ version?: string }>(join(context, JEST_BUILDER_PACKAGE_PATH));
    const majorVersion = Number.parseInt(builderManifest?.version ?? '', 10);

    // An uninstalled builder is treated as current: the configuration is then written for the
    // version the module declares rather than for a version that is not there.
    return Number.isNaN(majorVersion) ? CURRENT_JEST_BUILDER_MAJOR_VERSION : majorVersion;
};

export const reconcileAngularConfiguration = async (
    settings: MerchantPortalBuilderSettings,
    // Relative to the project root, which is where angular.json resolves them from; a configuration
    // generated inside the builder is therefore not a bare file name.
    typeScriptConfigurationPaths: { build: string; spec: string },
): Promise<ReconciledAngularConfiguration> => {
    const { layout, paths } = settings;
    const resolveCorePath = (moduleRelativePath: string): Promise<string> =>
        resolveCoreModuleFilePath(paths.coreModulesDirectory, layout.coreModulesDirectory, moduleRelativePath);

    const webpackConfigPath = await resolveCorePath(WEBPACK_CONFIG_MODULE_RELATIVE_PATH);
    const indexTransformPath = await resolveCorePath(INDEX_TRANSFORM_MODULE_RELATIVE_PATH);
    const jestConfigPath = await resolveCorePath(JEST_CONFIG_MODULE_RELATIVE_PATH);
    const coreStylesPath = await resolveCorePath(CORE_STYLES_MODULE_RELATIVE_PATH);

    const filePath = join(settings.context, ANGULAR_CONFIGURATION_FILE_NAME);
    const existingConfiguration = readConfigurationFile<AngularConfiguration>(filePath);
    const wasCreated = existingConfiguration === null;
    const configuration = existingConfiguration ?? buildDefaultAngularConfiguration();
    const project = resolveMerchantPortalProject(configuration);

    // The nested containers are created when missing, so a configuration that lacks a build or test
    // target still receives the options this builder owns instead of silently dropping them.
    const architect = (project.architect ??= {});
    const buildTarget = (architect.build ??= {});
    const testTarget = (architect.test ??= {});
    const buildOptions = (buildTarget.options ??= {}) as AngularBuildOptions;
    const testOptions = (testTarget.options ??= {}) as AngularTestOptions;

    buildOptions.customWebpackConfig = { ...(buildOptions.customWebpackConfig ?? {}), path: `./${webpackConfigPath}` };
    buildOptions.indexTransform = `./${indexTransformPath}`;
    buildOptions.outputPath = toPosixPath(relative(settings.context, paths.outputDirectory));
    buildOptions.baseHref = settings.urls.assetsPublicPath;
    buildOptions.tsConfig = typeScriptConfigurationPaths.build;

    buildOptions.assets = reconcileEntryList<AngularAsset>(
        buildOptions.assets,
        [
            {
                glob: settings.globs.coreAssetFiles,
                input: joinConfigurationPath(layout.coreModulesDirectory),
                output: '/assets/',
            },
            {
                glob: settings.globs.coreStaticFiles,
                input: joinConfigurationPath(layout.coreModulesDirectory),
                output: '/static/',
            },
        ],
        (existingAsset) => isCoreInput(existingAsset.input),
    );

    buildOptions.styles = reconcileEntryList<string>(buildOptions.styles, [coreStylesPath], (existingStyle) =>
        matchesAnyPathTemplate(
            existingStyle,
            merchantPortalSourceLayouts.map((sourceLayout) =>
                joinConfigurationPath(sourceLayout.coreModulesDirectory, '*', CORE_STYLES_MODULE_RELATIVE_PATH),
            ),
        ),
    );

    testOptions.tsConfig = typeScriptConfigurationPaths.spec;
    const jestBuilderMajorVersion = resolveJestBuilderMajorVersion(settings.context);

    // The option the detected version does not know is removed, so switching builder majors does not
    // leave the previous name behind next to the current one.
    if (jestBuilderMajorVersion >= CURRENT_JEST_BUILDER_MAJOR_VERSION) {
        testOptions.config = jestConfigPath;
        delete testOptions.configPath;
    } else {
        testOptions.configPath = jestConfigPath;
        delete testOptions.config;
        delete testOptions.zoneless;
    }

    // @angular-builders/jest 22 defaults this to true, and Merchant Portal uses zone.js change
    // detection, so the default would run the suite in an environment the application does not use.
    // Earlier majors neither default to it nor accept the boolean, so writing it there makes the
    // builder reject the whole configuration.
    if (jestBuilderMajorVersion >= CURRENT_JEST_BUILDER_MAJOR_VERSION) {
        testOptions.zoneless = false;
    }

    return { fileName: ANGULAR_CONFIGURATION_FILE_NAME, filePath, configuration, wasCreated };
};
