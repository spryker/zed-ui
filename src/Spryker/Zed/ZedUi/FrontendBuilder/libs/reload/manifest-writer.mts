import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Compiler, Stats, WebpackPluginInstance } from 'webpack';

export const MANIFEST_FILENAME = 'dev-build-manifest.json';

const copiedStaticAssetDirectoryNames = new Set(['assets', 'static']);

export interface AssetHashMap {
    [relativeAssetPath: string]: string;
}

export interface DevBuildManifest {
    buildId: number;
    assets: AssetHashMap;
}

export interface ManifestWriterPluginOptions {
    outputDirectory: string;
}

const collectHashableFiles = (directory: string, isOutputRoot: boolean): string[] => {
    const collected: string[] = [];

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (isOutputRoot && copiedStaticAssetDirectoryNames.has(entry.name)) {
                continue;
            }

            collected.push(...collectHashableFiles(join(directory, entry.name), false));

            continue;
        }

        collected.push(join(directory, entry.name));
    }

    return collected;
};

const isHashableAssetFile = (filePath: string): boolean => {
    if (filePath.endsWith('.map')) {
        return false;
    }

    return filePath.endsWith('.js') || filePath.endsWith('.css');
};

const toRelativePosixPath = (outputDirectory: string, filePath: string): string =>
    relative(outputDirectory, filePath).split(sep).join('/');

export const hashEmittedAssets = (outputDirectory: string): AssetHashMap => {
    const assetHashes: AssetHashMap = {};

    if (!existsSync(outputDirectory)) {
        return assetHashes;
    }

    const sortedFiles = collectHashableFiles(outputDirectory, true).sort();

    for (const filePath of sortedFiles) {
        if (!isHashableAssetFile(filePath)) {
            continue;
        }

        assetHashes[toRelativePosixPath(outputDirectory, filePath)] = createHash('sha256')
            .update(readFileSync(filePath))
            .digest('hex');
    }

    return assetHashes;
};

let temporaryFileCounter = 0;

export const writeDevBuildManifest = (outputDirectory: string, manifest: DevBuildManifest): void => {
    const manifestPath = join(outputDirectory, MANIFEST_FILENAME);
    temporaryFileCounter += 1;
    const temporaryPath = join(outputDirectory, `${MANIFEST_FILENAME}.${process.pid}.${temporaryFileCounter}.tmp`);
    const serializedManifest = `${JSON.stringify(manifest, null, 2)}\n`;

    try {
        writeFileSync(temporaryPath, serializedManifest);
        renameSync(temporaryPath, manifestPath);
    } catch (error) {
        if (existsSync(temporaryPath)) {
            rmSync(temporaryPath, { force: true });
        }

        const reason = error instanceof Error ? error.message : String(error);

        throw new Error(
            `Failed to write the Merchant Portal dev live-reload manifest to ${manifestPath}. ` +
                `Reason: ${reason}. ` +
                `Ensure the webpack output directory exists and is writable, then re-run npm run mp:build:watch.`,
        );
    }
};

export const createManifestWriterPlugin = ({ outputDirectory }: ManifestWriterPluginOptions): WebpackPluginInstance => {
    let buildId = 0;

    return {
        apply(compiler: Compiler): void {
            compiler.hooks.done.tap('MerchantPortalDevReloadManifestWriter', (stats: Stats): void => {
                if (stats.hasErrors()) {
                    return;
                }

                buildId += 1;

                const manifest: DevBuildManifest = {
                    buildId,
                    assets: hashEmittedAssets(outputDirectory),
                };

                try {
                    writeDevBuildManifest(outputDirectory, manifest);
                } catch (error) {
                    console.error(error instanceof Error ? error.message : String(error));
                }
            });
        },
    };
};
