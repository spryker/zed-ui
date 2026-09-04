import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const CLIENT_SOURCE_FILE_NAMES = ['reload-state.ts', 'reload-client.ts'];
const CLIENT_ENTRY_SOURCE_FILE_NAME = 'reload-client.ts';

const GENERATED_DIRECTORY_SEGMENTS = ['.angular', 'merchant-portal-dev-reload'];

const MANIFEST_URL_GLOBAL_NAME = '__RELOAD_MANIFEST_URL__';

const transpileOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
    isolatedModules: true,
    removeComments: true,
};

export interface ReloadClientCompilerOptions {
    context: string;
    reloadManifestUrl: string;
}

const toEmittedFileName = (sourceFileName: string): string => sourceFileName.replace(/\.ts$/, '.js');

const declareManifestUrl = (reloadManifestUrl: string): string =>
    `const ${MANIFEST_URL_GLOBAL_NAME} = ${JSON.stringify(reloadManifestUrl)};\n`;

export const compileReloadClient = ({ context, reloadManifestUrl }: ReloadClientCompilerOptions): string => {
    const sourceDirectory = fileURLToPath(new URL('./client/', import.meta.url));
    const generatedDirectory = join(context, ...GENERATED_DIRECTORY_SEGMENTS);

    try {
        mkdirSync(generatedDirectory, { recursive: true });
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);

        throw new Error(
            `Failed to create the Merchant Portal reload client output directory ${generatedDirectory}. ` +
                `Reason: ${reason}. ` +
                `Ensure the project root is writable, then re-run npm run mp:build:watch.`,
        );
    }

    for (const sourceFileName of CLIENT_SOURCE_FILE_NAMES) {
        const sourcePath = join(sourceDirectory, sourceFileName);
        const emittedPath = join(generatedDirectory, toEmittedFileName(sourceFileName));
        const isEntryFile = sourceFileName === CLIENT_ENTRY_SOURCE_FILE_NAME;

        try {
            const { outputText } = ts.transpileModule(readFileSync(sourcePath, 'utf8'), {
                compilerOptions: transpileOptions,
                fileName: sourcePath,
            });

            writeFileSync(
                emittedPath,
                isEntryFile ? `${declareManifestUrl(reloadManifestUrl)}${outputText}` : outputText,
            );
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);

            throw new Error(
                `Failed to transpile the Merchant Portal reload client source ${sourcePath} to ${emittedPath}. ` +
                    `Reason: ${reason}. ` +
                    `Check that the file exists and contains valid TypeScript, then re-run ` +
                    `npm run mp:build:watch.`,
            );
        }
    }

    return join(generatedDirectory, toEmittedFileName(CLIENT_ENTRY_SOURCE_FILE_NAME));
};
