import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import {
    ENTRY_POINT_NAME_PREFIX,
    SINGLE_ENTRY_POINT_MARKER,
    SINGLE_ENTRY_POINT_NAME,
    type MerchantPortalBuilderSettings,
} from '../settings.mts';
import { buildEntryPointName, expandModuleRootDirectories, findEntryPointFiles } from './utils.mts';

export type EntryPointValue = string | string[];

export interface DiscoveredEntryPoints {
    entryPointsMap: Record<string, EntryPointValue>;
    entryPointFiles: string[];
}

const collectEntryPointsInDirectory = (
    moduleRootDirectory: string,
    relativeEntryPointPaths: string[],
    singleEntryPointPathsByName: Map<string, string>,
): Record<string, string> => {
    const ownChunkEntryPoints: Record<string, string> = {};

    relativeEntryPointPaths.forEach((relativeEntryPointPath) => {
        const entryPointFilePath = join(moduleRootDirectory, relativeEntryPointPath);
        const entryPointName = buildEntryPointName(ENTRY_POINT_NAME_PREFIX, relativeEntryPointPath);
        const isSingleEntryPoint = readFileSync(entryPointFilePath, { encoding: 'utf8' }).includes(
            SINGLE_ENTRY_POINT_MARKER,
        );

        if (isSingleEntryPoint || singleEntryPointPathsByName.has(entryPointName)) {
            singleEntryPointPathsByName.set(entryPointName, entryPointFilePath);

            return;
        }

        ownChunkEntryPoints[entryPointName] = entryPointFilePath;
    });

    return ownChunkEntryPoints;
};

export const discoverEntryPoints = async (settings: MerchantPortalBuilderSettings): Promise<DiscoveredEntryPoints> => {
    const singleEntryPointPathsByName = new Map<string, string>();
    const entryPointFiles: string[] = [];

    const collectEntryPoints = async (
        absoluteDirectoryPattern: string,
        entryPointGlob: string,
    ): Promise<Record<string, string>> => {
        const moduleRootDirectories = await expandModuleRootDirectories(absoluteDirectoryPattern);
        const collected: Record<string, string>[] = [];

        for (const moduleRootDirectory of moduleRootDirectories) {
            const relativeEntryPointPaths = await findEntryPointFiles(moduleRootDirectory, entryPointGlob);

            relativeEntryPointPaths.forEach((relativeEntryPointPath) => {
                entryPointFiles.push(join(moduleRootDirectory, relativeEntryPointPath));
            });

            collected.push(
                collectEntryPointsInDirectory(
                    moduleRootDirectory,
                    relativeEntryPointPaths,
                    singleEntryPointPathsByName,
                ),
            );
        }

        return Object.assign({}, ...collected);
    };

    const coreEntryPoints = await collectEntryPoints(
        settings.paths.coreModulesDirectory,
        settings.globs.coreEntryPointFile,
    );
    const projectEntryPoints = await collectEntryPoints(
        settings.paths.projectModulesDirectory,
        settings.globs.projectEntryPointFile,
    );

    if (entryPointFiles.length === 0) {
        throw new Error(
            `No Merchant Portal entry point was found for ${settings.context} ` +
                `(detected layout: ${settings.layout.name}).\n` +
                `Scanned "${settings.paths.coreModulesDirectory}" for ` +
                `"${settings.globs.coreEntryPointFile}" and "${settings.paths.projectModulesDirectory}" for ` +
                `"${settings.globs.projectEntryPointFile}" and matched nothing, so no module would ` +
                `register itself and the built application would be empty.\n` +
                `Run the build from the project root, and check that the Merchant Portal modules are ` +
                `installed there.\n`,
        );
    }

    const singleChunkEntryPointFiles = [...singleEntryPointPathsByName.values()];

    return {
        entryPointsMap: {
            ...coreEntryPoints,
            ...projectEntryPoints,
            ...(singleChunkEntryPointFiles.length > 0 ? { [SINGLE_ENTRY_POINT_NAME]: singleChunkEntryPointFiles } : {}),
        },
        entryPointFiles,
    };
};
