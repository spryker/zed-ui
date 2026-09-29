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
import {
    PROJECT_CONFIGURATION_FILE_NAME,
    reconcileSolutionConfiguration,
    type SolutionReconciliation,
} from './solution-configuration.mts';

export const BUILD_CONFIGURATION_FILE_NAME = 'tsconfig.mp.json';
export const SPEC_CONFIGURATION_FILE_NAME = 'tsconfig.mp.spec.json';
export const LINT_CONFIGURATION_FILE_NAME = 'tsconfig.mp.lint.json';
export const DEFAULTS_CONFIGURATION_FILE_NAME = 'tsconfig.defaults.json';

// Formerly the project root tsconfig.json; the root now only carries what a project overrides.
const SHARED_COMPILER_OPTIONS: Record<string, unknown> = {
    sourceMap: true,
    noImplicitAny: false,
    declaration: false,
    emitDecoratorMetadata: true,
    experimentalDecorators: true,
    noEmitHelpers: true,
    importHelpers: true,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    removeComments: true,
    useDefineForClassFields: false,
    moduleResolution: 'bundler',
    target: 'es2020',
    module: 'esnext',
    lib: ['dom', 'esnext'],
    strict: false,
};

const SHARED_EXCLUDED_PATHS = ['**/node_modules/**', '**/*.spec.ts', '**/*.test.ts', 'public', 'dist', '**/dist/**'];

const MERCHANT_PORTAL_COMPILER_OPTIONS: Record<string, unknown> = {
    target: 'ES2022',
};

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
// declares them otherwise. A project that still sets `baseUrl` in its root configuration therefore
// needs the aliases written relative to the project root, without the parent ladder.
const hasBaseUrl = (context: string): boolean => {
    const baseConfiguration = readConfigurationFile<TypeScriptConfiguration>(
        join(context, PROJECT_CONFIGURATION_FILE_NAME),
    );

    return baseConfiguration?.compilerOptions?.baseUrl !== undefined;
};

export interface TypeScriptConfiguration {
    extends?: string | string[];
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

const buildProjectPaths = (layout: MerchantPortalSourceLayout, projectGlob: string): string[] =>
    Object.values(layout.projectModulesDirectories).map((directory) => joinConfigurationPath(directory, projectGlob));

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
    buildConfiguration: string;
}

// The project root comes last, so the options a project sets there override the builder defaults.
const buildGeneratedExtends = (parentDirectoryLadder: string): string[] => [
    `./${DEFAULTS_CONFIGURATION_FILE_NAME}`,
    buildRelativeReference(parentDirectoryLadder, PROJECT_CONFIGURATION_FILE_NAME),
];

const buildDefaultBuildConfiguration = ({
    parentDirectoryLadder,
}: ConfigurationReferences): TypeScriptConfiguration => ({
    extends: buildGeneratedExtends(parentDirectoryLadder),
    compilerOptions: {},
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

// The same entry written for the other source layout, or for a namespace the project registered, has
// to be recognised too, otherwise switching layouts would leave the previous paths in the file next
// to the new ones.
const buildRecognisedPathTemplates = (
    effectiveLayout: MerchantPortalSourceLayout,
    coreGlobs: string[],
    projectGlobs: string[],
): string[] =>
    [...merchantPortalSourceLayouts, effectiveLayout].flatMap((layout) => [
        ...coreGlobs.map((coreGlob) => joinConfigurationPath(layout.coreModulesDirectory, coreGlob)),
        ...projectGlobs.flatMap((projectGlob) => buildProjectPaths(layout, projectGlob)),
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
                ...buildRecognisedPathTemplates(layout, [globs.coreEntryPointFile], [globs.projectEntryPointFile]),
                // The application files of the other layout have to be recognised as well, otherwise
                // switching layouts would leave them behind next to the current layout's ones.
                ...[...merchantPortalSourceLayouts, layout].flatMap(buildProjectApplicationFiles),
            ],
            sections: {
                paths: sortPathAliases({
                    ...(await buildGeneratedModulePathAliases(settings)),
                    ...(await buildPolyfillsPathAlias(settings)),
                }),
                include: [
                    ...buildProjectApplicationFiles(layout),
                    buildLayoutPath(layout, globs.coreEntryPointFile),
                    ...buildProjectPaths(layout, globs.projectEntryPointFile),
                ],
            },
        },
        {
            fileName: SPEC_CONFIGURATION_FILE_NAME,
            buildDefaults: buildDefaultSpecConfiguration,
            // The test setup file is matched by its module-relative path so a stale entry pointing at
            // another layout's module directory is replaced rather than kept alongside the new one.
            recognisedPathTemplates: buildRecognisedPathTemplates(
                layout,
                [globs.coreSpecFiles, `*/${TEST_SETUP_MODULE_RELATIVE_PATH}`],
                [globs.projectSpecFiles],
            ),
            sections: {
                files: [testSetupPath],
                include: [
                    ...buildProjectPaths(layout, globs.projectSpecFiles),
                    buildLayoutPath(layout, globs.coreSpecFiles),
                ],
            },
        },
        {
            fileName: LINT_CONFIGURATION_FILE_NAME,
            buildDefaults: buildDefaultLintConfiguration,
            recognisedPathTemplates: buildRecognisedPathTemplates(
                layout,
                [globs.coreSourceFiles],
                [globs.projectSourceFiles],
            ),
            sections: {
                include: [
                    buildLayoutPath(layout, globs.coreSourceFiles),
                    ...buildProjectPaths(layout, globs.projectSourceFiles),
                ],
            },
        },
    ];
};

const resolveBuilderDirectory = async (settings: MerchantPortalBuilderSettings): Promise<string> =>
    directoryOfConfigurationPath(
        await resolveCoreModuleFilePath(
            settings.paths.coreModulesDirectory,
            settings.layout.coreModulesDirectory,
            TEST_SETUP_MODULE_RELATIVE_PATH,
        ),
    );

/** Rewritten on every run: the builder owns it, and a project overrides it from its root tsconfig.json. */
export const reconcileDefaultsConfiguration = async (
    settings: MerchantPortalBuilderSettings,
): Promise<{ filePath: string; configuration: TypeScriptConfiguration }> => {
    const directory = await resolveBuilderDirectory(settings);
    const parentDirectoryLadder = buildParentDirectoryLadder(directory);

    return {
        filePath: join(settings.context, directory, DEFAULTS_CONFIGURATION_FILE_NAME),
        configuration: {
            compilerOptions: {
                ...SHARED_COMPILER_OPTIONS,
                // Path-bearing options resolve against this file, so they climb back to the project root.
                typeRoots: [joinConfigurationPath(parentDirectoryLadder, 'node_modules/@types')],
                rootDir: parentDirectoryLadder,
                ...MERCHANT_PORTAL_COMPILER_OPTIONS,
            },
            // An exclude glob resolves against this file as well, the `**/` ones included.
            exclude: SHARED_EXCLUDED_PATHS.map((excludedPath) =>
                joinConfigurationPath(parentDirectoryLadder, excludedPath),
            ),
        },
    };
};

export const reconcileProjectSolution = async (
    settings: MerchantPortalBuilderSettings,
): Promise<SolutionReconciliation> => {
    const directory =
        resolveConfigurationLocation(settings.context, BUILD_CONFIGURATION_FILE_NAME) === 'projectRoot'
            ? ''
            : await resolveBuilderDirectory(settings);
    // The module directory name differs per layout, so the other layout's reference is matched by template.
    const equivalentReferenceTemplates = [
        BUILD_CONFIGURATION_FILE_NAME,
        ...merchantPortalSourceLayouts.map((layout) =>
            joinConfigurationPath(
                layout.coreModulesDirectory,
                '*',
                BUILDER_MODULE_RELATIVE_DIRECTORY,
                BUILD_CONFIGURATION_FILE_NAME,
            ),
        ),
    ];

    return reconcileSolutionConfiguration(settings.context, {
        referencePath: `./${joinConfigurationPath(directory, BUILD_CONFIGURATION_FILE_NAME)}`,
        isEquivalentReference: (referencePath) => matchesAnyPathTemplate(referencePath, equivalentReferenceTemplates),
    });
};

export const reconcileTypeScriptConfigurations = async (
    settings: MerchantPortalBuilderSettings,
): Promise<ReconciledTypeScriptConfiguration[]> => {
    const configurationPlans = await buildConfigurationPlans(settings);
    const builderDirectory = await resolveBuilderDirectory(settings);

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

        // Generated like `paths`; a copy the project keeps in its root keeps whatever it extends.
        if (fileName === BUILD_CONFIGURATION_FILE_NAME && location === 'builder') {
            configuration.extends = buildGeneratedExtends(parentDirectoryLadder);
        }

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
