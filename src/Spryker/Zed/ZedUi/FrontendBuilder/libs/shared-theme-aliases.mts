// Adapted from the Gui and ShopUi FrontendBuilders' shared-theme-aliases.mts until the builders share a package.
import { join } from 'node:path';
import glob from 'fast-glob';
import { joinConfigurationPath, toConfigurationPathSegments } from './utils.mts';

/** Project-root-relative source roots, classified by the builder settings. */
export interface SourceRoots {
    context: string;
    core: string[];
    /** Strongest first, as `KernelConstants::PROJECT_NAMESPACES` orders the namespaces. */
    project: string[];
}

/** Alias name → project-root-relative targets, tried in order: the first that resolves wins. */
export type SharedThemePathAliases = Record<string, string[]>;

// Frontend code one module ships to several applications lives in its Shared layer, beside Yves and Zed.
export const SHARED_ALIAS_PREFIX = '@shared/';
const APPLICATION_LAYER_DIRECTORY_NAME = 'Zed';
const SHARED_LAYER_DIRECTORY_NAME = 'Shared';
const SHARED_THEME_SUFFIX = 'Theme/default';
const MODULE_SHARED_THEME_DIRECTORY_PATTERN = `*/src/*/${SHARED_LAYER_DIRECTORY_NAME}/*/${SHARED_THEME_SUFFIX}`;
const TYPESCRIPT_SOURCE_PATTERN = '**/*.ts';
const ALIAS_WILDCARD = '*';

const dasherize = (value: string): string => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

// A project root ends in the application layer (`src/Pyz/Zed`, `src/Pyz/*/src/Pyz/Zed`) and keeps its Shared
// layer in the sibling directory; a core root is a namespace root holding one package per module.
const isApplicationLayerRoot = (sourceRoot: string): boolean =>
    toConfigurationPathSegments(sourceRoot).at(-1) === APPLICATION_LAYER_DIRECTORY_NAME;

const buildSharedThemeDirectoryPattern = (sourceRoot: string): string =>
    isApplicationLayerRoot(sourceRoot)
        ? joinConfigurationPath(
              ...toConfigurationPathSegments(sourceRoot).slice(0, -1),
              SHARED_LAYER_DIRECTORY_NAME,
              ALIAS_WILDCARD,
              SHARED_THEME_SUFFIX,
          )
        : joinConfigurationPath(sourceRoot, MODULE_SHARED_THEME_DIRECTORY_PATTERN);

/** The include glob a TypeScript configuration lists for the Shared themes one source root may hold. */
export const buildSharedThemeSourcePattern = (sourceRoot: string): string =>
    joinConfigurationPath(buildSharedThemeDirectoryPattern(sourceRoot), TYPESCRIPT_SOURCE_PATTERN);

/** The include glob for the TypeScript below one alias target (`./…/Theme/default/*`). */
export const toSharedThemeSourcePattern = (aliasTarget: string): string =>
    joinConfigurationPath(
        ...toConfigurationPathSegments(aliasTarget).filter((segment) => segment !== ALIAS_WILDCARD),
        TYPESCRIPT_SOURCE_PATTERN,
    );

const findSharedThemeDirectories = async (context: string, sourceRoot: string): Promise<string[]> =>
    (
        await glob(buildSharedThemeDirectoryPattern(sourceRoot), {
            cwd: context,
            onlyDirectories: true,
            onlyFiles: false,
            unique: true,
            followSymbolicLinks: false,
        })
    ).sort();

// `…/<Module>/Theme/default`: the module is the segment above `Theme`.
const getSharedThemeModuleName = (sharedThemeDirectory: string): string =>
    toConfigurationPathSegments(sharedThemeDirectory).slice(-3)[0];

const toAliasTarget = (sharedThemeDirectory: string): string =>
    `./${joinConfigurationPath(sharedThemeDirectory, ALIAS_WILDCARD)}`;

// Two core directories for one module leave `@shared` without a single fallback, so neither may win silently.
const assertSingleCoreSharedThemeDirectory = (
    context: string,
    moduleName: string,
    coreDirectory: string,
    otherCoreDirectory: string,
): void => {
    if (coreDirectory === otherCoreDirectory) {
        return;
    }

    throw new Error(
        `The Shared theme of module "${moduleName}" exists in two core source roots: ` +
            `${join(context, coreDirectory)} and ${join(context, otherCoreDirectory)}.\n` +
            `"${SHARED_ALIAS_PREFIX}${dasherize(moduleName)}/*" must fall back to exactly one core directory, ` +
            `and choosing one would hide the other's files.\n` +
            `Remove the module from one of the core namespaces, or, if one of them is the project's own code, ` +
            `register its namespace in KernelConstants::PROJECT_NAMESPACES so it shadows the core module.\n`,
    );
};

/**
 * One alias per module that ships a Shared theme. Project directories come first, in the backend namespace order the
 * twig loader uses, and the core directory last, so a project file shadows the core one in TypeScript and SCSS alike.
 */
export const buildSharedThemePathAliases = async ({
    context,
    core,
    project,
}: SourceRoots): Promise<SharedThemePathAliases> => {
    const coreDirectoryByModule = new Map<string, string>();
    const projectDirectoriesByModule = new Map<string, string[]>();

    for (const sourceRoot of core) {
        for (const sharedThemeDirectory of await findSharedThemeDirectories(context, sourceRoot)) {
            const moduleName = getSharedThemeModuleName(sharedThemeDirectory);
            const coreDirectory = coreDirectoryByModule.get(moduleName);

            if (coreDirectory !== undefined) {
                assertSingleCoreSharedThemeDirectory(context, moduleName, coreDirectory, sharedThemeDirectory);
            }

            coreDirectoryByModule.set(moduleName, sharedThemeDirectory);
        }
    }

    for (const sourceRoot of project) {
        for (const sharedThemeDirectory of await findSharedThemeDirectories(context, sourceRoot)) {
            const moduleName = getSharedThemeModuleName(sharedThemeDirectory);
            const projectDirectories = projectDirectoriesByModule.get(moduleName) ?? [];

            if (!projectDirectories.includes(sharedThemeDirectory)) {
                projectDirectoriesByModule.set(moduleName, [...projectDirectories, sharedThemeDirectory]);
            }
        }
    }

    const aliases: SharedThemePathAliases = {};

    for (const moduleName of new Set([...projectDirectoriesByModule.keys(), ...coreDirectoryByModule.keys()])) {
        const coreDirectory = coreDirectoryByModule.get(moduleName);

        aliases[`${SHARED_ALIAS_PREFIX}${dasherize(moduleName)}/${ALIAS_WILDCARD}`] = [
            ...(projectDirectoriesByModule.get(moduleName) ?? []),
            ...(coreDirectory === undefined ? [] : [coreDirectory]),
        ].map(toAliasTarget);
    }

    return aliases;
};

/** A configuration still carries the aliases an earlier run emitted; this tells a stale one from a hand-written one. */
export const isSharedThemeAliasOfSourceRoots = (
    aliasName: string,
    aliasValues: unknown,
    sourceRoots: string[],
): boolean => {
    if (!aliasName.startsWith(SHARED_ALIAS_PREFIX) || !Array.isArray(aliasValues) || aliasValues.length === 0) {
        return false;
    }

    const directoryPatterns = sourceRoots.map(buildSharedThemeDirectoryPattern);

    return aliasValues.every((aliasValue) => {
        const segments = toConfigurationPathSegments(String(aliasValue));
        const valueSegments = segments.slice(segments.findIndex((segment) => segment !== '..'));

        return directoryPatterns.some((directoryPattern) => {
            const patternSegments = [...toConfigurationPathSegments(directoryPattern), ALIAS_WILDCARD];

            return (
                patternSegments.length === valueSegments.length &&
                patternSegments.every(
                    (patternSegment, index) =>
                        patternSegment === ALIAS_WILDCARD || patternSegment === valueSegments[index],
                )
            );
        });
    });
};
