import {
    MODULE_PATH_ALIAS_PREFIX,
    POLYFILLS_MODULE_RELATIVE_PATH,
    POLYFILLS_PATH_ALIAS_NAME,
    PUBLIC_API_FILE_NAME,
    merchantPortalSourceLayouts,
    type MerchantPortalBuilderSettings,
} from '../settings.mts';
import {
    buildEntryPointName,
    expandModuleRootDirectories,
    findEntryPointFiles,
    getModuleDirectoryName,
    joinConfigurationPath,
    resolveCoreModuleFilePath,
    toConfigurationPathSegments,
} from './utils.mts';

export type ModulePathAliases = Record<string, string[]>;

// Every generated alias points at a file that sits at a fixed position inside its core module. The
// module directory itself is the only unknown, so an alias value is recognised as generated when it
// is a known source layout's core directory, one directory, and one of these module-relative paths.
const GENERATED_ALIAS_MODULE_RELATIVE_PATHS = [PUBLIC_API_FILE_NAME, POLYFILLS_MODULE_RELATIVE_PATH];

export const sortPathAliases = (aliases: ModulePathAliases): ModulePathAliases =>
    Object.fromEntries(Object.entries(aliases).sort(([left], [right]) => left.localeCompare(right)));

export const buildGeneratedModulePathAliases = async (
    settings: MerchantPortalBuilderSettings,
): Promise<ModulePathAliases> => {
    const moduleRootDirectories = await expandModuleRootDirectories(settings.paths.coreModulesDirectory);
    const aliases: ModulePathAliases = {};

    for (const moduleRootDirectory of moduleRootDirectories) {
        const relativeEntryPointPaths = await findEntryPointFiles(
            moduleRootDirectory,
            settings.globs.coreEntryPointFile,
        );

        relativeEntryPointPaths.forEach((relativeEntryPointPath) => {
            const aliasName = buildEntryPointName(MODULE_PATH_ALIAS_PREFIX, relativeEntryPointPath);
            const aliasPath = joinConfigurationPath(
                settings.layout.coreModulesDirectory,
                getModuleDirectoryName(relativeEntryPointPath),
                PUBLIC_API_FILE_NAME,
            );

            aliases[aliasName] = [`./${aliasPath}`];
        });
    }

    return sortPathAliases(aliases);
};

export const buildPolyfillsPathAlias = async (settings: MerchantPortalBuilderSettings): Promise<ModulePathAliases> => {
    const polyfillsPath = await resolveCoreModuleFilePath(
        settings.paths.coreModulesDirectory,
        settings.layout.coreModulesDirectory,
        POLYFILLS_MODULE_RELATIVE_PATH,
    );

    return { [POLYFILLS_PATH_ALIAS_NAME]: [`./${polyfillsPath}`] };
};

const isGeneratedModulePathAlias = (aliasName: string, aliasValue: unknown): boolean => {
    if (!aliasName.startsWith(MODULE_PATH_ALIAS_PREFIX) || !Array.isArray(aliasValue) || aliasValue.length !== 1) {
        return false;
    }

    // A configuration generated outside the project root prefixes its values with a parent ladder,
    // which carries no information about the module the alias points at.
    const segments = toConfigurationPathSegments(String(aliasValue[0]));
    const firstNamedSegment = segments.findIndex((segment) => segment !== '..');

    if (firstNamedSegment === -1) {
        return false;
    }

    const valueSegments = segments.slice(firstNamedSegment);

    return merchantPortalSourceLayouts.some((layout) => {
        const coreDirectorySegments = toConfigurationPathSegments(layout.coreModulesDirectory);

        if (!coreDirectorySegments.every((segment, index) => valueSegments[index] === segment)) {
            return false;
        }

        const moduleRelativeSegments = valueSegments.slice(coreDirectorySegments.length + 1);

        return GENERATED_ALIAS_MODULE_RELATIVE_PATHS.includes(moduleRelativeSegments.join('/'));
    });
};

export const mergeModulePathAliases = (
    existingAliases: ModulePathAliases,
    generatedAliases: ModulePathAliases,
): ModulePathAliases => {
    // An alias the generator emits is owned by the generator, whatever value the file holds for it,
    // so a hand-edited value is corrected rather than preserved. An alias it no longer emits is
    // dropped when it still has a generated shape - its core module is gone - and kept otherwise.
    const handWrittenAliases = Object.fromEntries(
        Object.entries(existingAliases).filter(
            ([aliasName, aliasValue]) =>
                !(aliasName in generatedAliases) && !isGeneratedModulePathAlias(aliasName, aliasValue),
        ),
    );

    return { ...generatedAliases, ...handWrittenAliases };
};
