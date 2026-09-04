import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
    BUILDER_MODULE_RELATIVE_DIRECTORY,
    TEST_SETUP_MODULE_RELATIVE_PATH,
    merchantPortalSourceLayouts,
    type MerchantPortalBuilderSettings,
    type MerchantPortalSourceLayout,
} from '../settings.mts';
import {
    buildGeneratedModulePathAliases,
    buildPolyfillsPathAlias,
    mergeModulePathAliases,
    sortPathAliases,
    type ModulePathAliases,
} from './module-path-aliases.mts';
import {
    matchesAnyPathTemplate,
    readConfigurationFile,
    reconcileEntryList,
    type ReconciledConfiguration,
} from './configuration-file.mts';
import { joinConfigurationPath, resolveCoreModuleFilePath, toConfigurationPathSegments } from './utils.mts';

export const BUILD_CONFIGURATION_FILE_NAME = 'tsconfig.mp.json';
export const SPEC_CONFIGURATION_FILE_NAME = 'tsconfig.mp.spec.json';
export const LINT_CONFIGURATION_FILE_NAME = 'tsconfig.mp.lint.json';
// The root configuration every Merchant Portal configuration builds on. It is the project's own
// entry point, so a project that later folds tsconfig.base.json into it needs no change here.
const BASE_CONFIGURATION_FILE_NAME = 'tsconfig.json';

const PROJECT_APPLICATION_FILE_NAMES = ['main.ts', 'polyfills.ts', 'environments/environment.prod.ts'];

const buildProjectApplicationFiles = (layout: MerchantPortalSourceLayout): string[] =>
    PROJECT_APPLICATION_FILE_NAMES.map((fileName) =>
        joinConfigurationPath(layout.projectApplicationDirectory, fileName),
    );

const UNANCHORED_EXCLUDES = ['**/node_modules/**', '**/dist/**'];
const PROJECT_ROOT_EXCLUDES = ['public', 'dist'];

// A configuration is generated inside the builder unless the project keeps a file of that name in
// its root, in which case the reconciliation works on that one and writes no second copy.
type ConfigurationLocation = 'projectRoot' | 'builder';

const resolveConfigurationLocation = (context: string, fileName: string): ConfigurationLocation =>
    existsSync(join(context, fileName)) ? 'projectRoot' : 'builder';

// TypeScript resolves `paths` against `baseUrl` when one is in effect, and against the file that
// declares them otherwise. A project that still sets `baseUrl` in its base configuration therefore
// needs the aliases written relative to the project root, without the parent ladder.
const hasBaseUrl = (context: string): boolean => {
    const baseConfiguration = readConfigurationFile<TypeScriptConfiguration>(
        join(context, BASE_CONFIGURATION_FILE_NAME),
    );

    return baseConfiguration?.compilerOptions?.baseUrl !== undefined;
};

export interface TypeScriptConfiguration {
    extends?: string;
    compilerOptions?: Record<string, unknown> & { paths?: ModulePathAliases };
    angularCompilerOptions?: Record<string, unknown>;
    files?: string[];
    include?: string[];
    exclude?: string[];
}

// The layout-dependent sections. Everything else in a configuration file is written once, when the
// file does not exist yet, and is never touched again — so a project keeps its own compiler options.
interface GeneratedSections {
    paths?: ModulePathAliases;
    files?: string[];
    include?: string[];
}

export type ReconciledTypeScriptConfiguration = ReconciledConfiguration<TypeScriptConfiguration> & {
    configurationPath: string;
};

const buildLayoutPath = (layout: MerchantPortalSourceLayout, coreGlob: string): string =>
    joinConfigurationPath(layout.coreModulesDirectory, coreGlob);

const buildProjectPath = (layout: MerchantPortalSourceLayout, projectGlob: string): string =>
    joinConfigurationPath(layout.projectModulesDirectory, projectGlob);

// TypeScript resolves a path relative to the file holding it, while the builder computes every path
// relative to the project root, so a file outside the root prefixes them with a parent ladder.
const buildParentDirectoryLadder = (contextRelativeDirectory: string): string =>
    toConfigurationPathSegments(contextRelativeDirectory)
        .map(() => '..')
        .join('/');

const directoryOfConfigurationPath = (contextRelativeFilePath: string): string =>
    toConfigurationPathSegments(contextRelativeFilePath).slice(0, -1).join('/');

// `extends` resolves a value that starts with neither `./` nor `../` as a package name, so a
// reference from the project root has to keep its explicit `./` prefix.
const buildRelativeReference = (parentDirectoryLadder: string, contextRelativePath: string): string =>
    parentDirectoryLadder === ''
        ? `./${joinConfigurationPath(contextRelativePath)}`
        : joinConfigurationPath(parentDirectoryLadder, contextRelativePath);

const buildNeighbourReference = (fromDirectory: string, toDirectory: string, fileName: string): string =>
    fromDirectory === toDirectory
        ? `./${fileName}`
        : buildRelativeReference(
              buildParentDirectoryLadder(fromDirectory),
              joinConfigurationPath(toDirectory, fileName),
          );

const buildSharedExcludes = (parentDirectoryLadder: string): string[] => [
    ...UNANCHORED_EXCLUDES,
    ...PROJECT_ROOT_EXCLUDES.map((excludedPath) => joinConfigurationPath(parentDirectoryLadder, excludedPath)),
];

interface ConfigurationReferences {
    parentDirectoryLadder: string;
    baseConfiguration: string;
    buildConfiguration: string;
}

const buildDefaultBuildConfiguration = ({ baseConfiguration }: ConfigurationReferences): TypeScriptConfiguration => ({
    extends: baseConfiguration,
    compilerOptions: {
        target: 'ES2022',
    },
    include: [],
    angularCompilerOptions: {
        strictTemplates: false,
    },
});

const buildDefaultSpecConfiguration = ({
    parentDirectoryLadder,
    buildConfiguration,
}: ConfigurationReferences): TypeScriptConfiguration => ({
    extends: buildConfiguration,
    compilerOptions: {
        esModuleInterop: true,
        target: 'ES2022',
        module: 'CommonJS',
        types: ['jest', 'node'],
        isolatedModules: true,
    },
    files: [],
    include: [],
    exclude: buildSharedExcludes(parentDirectoryLadder),
});

const buildDefaultLintConfiguration = ({
    parentDirectoryLadder,
    buildConfiguration,
}: ConfigurationReferences): TypeScriptConfiguration => ({
    extends: buildConfiguration,
    include: [],
    exclude: buildSharedExcludes(parentDirectoryLadder),
});

interface ConfigurationPlan {
    fileName: string;
    buildDefaults: (references: ConfigurationReferences) => TypeScriptConfiguration;
    sections: GeneratedSections;
    recognisedPathTemplates: string[];
}

// The same entry written for the other source layout has to be recognised too, otherwise switching
// layouts would leave the previous layout's paths in the file next to the new ones.
const buildRecognisedPathTemplates = (coreGlobs: string[], projectGlobs: string[]): string[] =>
    merchantPortalSourceLayouts.flatMap((layout) => [
        ...coreGlobs.map((coreGlob) => joinConfigurationPath(layout.coreModulesDirectory, coreGlob)),
        ...projectGlobs.map((projectGlob) => joinConfigurationPath(layout.projectModulesDirectory, projectGlob)),
    ]);

// The ladder length depends on how deep the builder sits, which differs per layout, so an entry a
// previous run wrote under the other layout is only recognised when its ladder is recognised too.
const buildLaddersOfLocation = (location: ConfigurationLocation, builderDirectory: string): string[] => {
    if (location === 'projectRoot') {
        return [''];
    }

    const layoutLadders = merchantPortalSourceLayouts.map((layout) =>
        buildParentDirectoryLadder(
            joinConfigurationPath(layout.coreModulesDirectory, '*', BUILDER_MODULE_RELATIVE_DIRECTORY),
        ),
    );

    return [...new Set([buildParentDirectoryLadder(builderDirectory), ...layoutLadders])];
};

const buildConfigurationPlans = async (settings: MerchantPortalBuilderSettings): Promise<ConfigurationPlan[]> => {
    const { layout, globs } = settings;
    const testSetupPath = await resolveCoreModuleFilePath(
        settings.paths.coreModulesDirectory,
        layout.coreModulesDirectory,
        TEST_SETUP_MODULE_RELATIVE_PATH,
    );

    return [
        {
            fileName: BUILD_CONFIGURATION_FILE_NAME,
            buildDefaults: buildDefaultBuildConfiguration,
            recognisedPathTemplates: [
                ...buildRecognisedPathTemplates([globs.coreEntryPointFile], [globs.projectEntryPointFile]),
                // The application files of the other layout have to be recognised as well, otherwise
                // switching layouts would leave them behind next to the current layout's ones.
                ...merchantPortalSourceLayouts.flatMap(buildProjectApplicationFiles),
            ],
            sections: {
                paths: sortPathAliases({
                    ...(await buildGeneratedModulePathAliases(settings)),
                    ...(await buildPolyfillsPathAlias(settings)),
                }),
                include: [
                    ...buildProjectApplicationFiles(layout),
                    buildLayoutPath(layout, globs.coreEntryPointFile),
                    buildProjectPath(layout, globs.projectEntryPointFile),
                ],
            },
        },
        {
            fileName: SPEC_CONFIGURATION_FILE_NAME,
            buildDefaults: buildDefaultSpecConfiguration,
            // The test setup file is matched by its module-relative path so a stale entry pointing at
            // another layout's module directory is replaced rather than kept alongside the new one.
            recognisedPathTemplates: buildRecognisedPathTemplates(
                [globs.coreSpecFiles, `*/${TEST_SETUP_MODULE_RELATIVE_PATH}`],
                [globs.projectSpecFiles],
            ),
            sections: {
                files: [testSetupPath],
                include: [
                    buildProjectPath(layout, globs.projectSpecFiles),
                    buildLayoutPath(layout, globs.coreSpecFiles),
                ],
            },
        },
        {
            fileName: LINT_CONFIGURATION_FILE_NAME,
            buildDefaults: buildDefaultLintConfiguration,
            recognisedPathTemplates: buildRecognisedPathTemplates([globs.coreSourceFiles], [globs.projectSourceFiles]),
            sections: {
                include: [
                    buildLayoutPath(layout, globs.coreSourceFiles),
                    buildProjectPath(layout, globs.projectSourceFiles),
                ],
            },
        },
    ];
};

export const reconcileTypeScriptConfigurations = async (
    settings: MerchantPortalBuilderSettings,
): Promise<ReconciledTypeScriptConfiguration[]> => {
    const configurationPlans = await buildConfigurationPlans(settings);
    const builderDirectory = directoryOfConfigurationPath(
        await resolveCoreModuleFilePath(
            settings.paths.coreModulesDirectory,
            settings.layout.coreModulesDirectory,
            TEST_SETUP_MODULE_RELATIVE_PATH,
        ),
    );

    const buildConfigurationDirectory =
        resolveConfigurationLocation(settings.context, BUILD_CONFIGURATION_FILE_NAME) === 'projectRoot'
            ? ''
            : builderDirectory;

    return configurationPlans.map(({ fileName, buildDefaults, sections, recognisedPathTemplates }) => {
        const location = resolveConfigurationLocation(settings.context, fileName);
        const directory = location === 'projectRoot' ? '' : builderDirectory;
        const parentDirectoryLadder = buildParentDirectoryLadder(directory);
        const references: ConfigurationReferences = {
            parentDirectoryLadder,
            baseConfiguration: buildRelativeReference(parentDirectoryLadder, BASE_CONFIGURATION_FILE_NAME),
            buildConfiguration: buildNeighbourReference(
                directory,
                buildConfigurationDirectory,
                BUILD_CONFIGURATION_FILE_NAME,
            ),
        };
        const configurationPath = joinConfigurationPath(directory, fileName);
        const filePath = join(settings.context, configurationPath);
        const fromConfigurationDirectory = (contextRelativePath: string): string =>
            joinConfigurationPath(parentDirectoryLadder, contextRelativePath);
        const laddersOfLocation = buildLaddersOfLocation(location, builderDirectory);
        const recognisedTemplates = laddersOfLocation.flatMap((ladder) =>
            recognisedPathTemplates.map((pathTemplate) => joinConfigurationPath(ladder, pathTemplate)),
        );

        const existingConfiguration = readConfigurationFile<TypeScriptConfiguration>(filePath);
        const wasCreated = existingConfiguration === null;
        const configuration: TypeScriptConfiguration = existingConfiguration ?? buildDefaults(references);

        if (sections.paths !== undefined) {
            const compilerOptions = configuration.compilerOptions ?? {};

            const aliasLadder = hasBaseUrl(settings.context) ? '' : parentDirectoryLadder;
            const generatedAliases = Object.fromEntries(
                Object.entries(sections.paths).map(([aliasName, aliasValues]) => [
                    aliasName,
                    aliasValues.map((aliasValue) => buildRelativeReference(aliasLadder, aliasValue)),
                ]),
            );

            compilerOptions.paths = sortPathAliases(
                mergeModulePathAliases(compilerOptions.paths ?? {}, generatedAliases),
            );
            configuration.compilerOptions = compilerOptions;
        }

        if (sections.files !== undefined) {
            configuration.files = reconcileEntryList(
                configuration.files,
                sections.files.map(fromConfigurationDirectory),
                (existingPath) => matchesAnyPathTemplate(existingPath, recognisedTemplates),
            );
        }

        if (sections.include !== undefined) {
            configuration.include = reconcileEntryList(
                configuration.include,
                sections.include.map(fromConfigurationDirectory),
                (existingPath) => matchesAnyPathTemplate(existingPath, recognisedTemplates),
            );
        }

        return { fileName, filePath, configurationPath, configuration, wasCreated };
    });
};
