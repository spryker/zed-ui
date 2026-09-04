import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
    MANIFEST_FILENAME,
    createManifestWriterPlugin,
    hashEmittedAssets,
    writeDevBuildManifest,
} from '../libs/reload/manifest-writer.mts';
import type { DevBuildManifest } from '../libs/reload/manifest-writer.mts';
import { fixturePath } from './helpers/fixtures.mts';
import type { Compiler, Stats } from 'webpack';

const createFakeCompiler = () => {
    let doneHandler: ((stats: Stats) => void) | undefined;

    const compiler = {
        hooks: {
            done: {
                tap: (_name: string, handler: (stats: Stats) => void) => {
                    doneHandler = handler;
                },
            },
        },
    } as unknown as Compiler;

    const fireCompilation = (hasErrors: boolean): void => {
        doneHandler?.({ hasErrors: () => hasErrors } as unknown as Stats);
    };

    return { compiler, fireCompilation };
};

const sha256 = (content: string): string => createHash('sha256').update(content).digest('hex');

let outputDirectory: string;

beforeEach(() => {
    outputDirectory = mkdtempSync(join(tmpdir(), 'merchant-portal-manifest-writer-'));
    cpSync(fixturePath('merchant-portal-output'), outputDirectory, { recursive: true });
});

afterEach(() => {
    rmSync(outputDirectory, { recursive: true, force: true });
});

describe('hashEmittedAssets', () => {
    it('hashes the flat root chunks and the spy entry chunk, keyed by output-relative posix path', () => {
        const assetHashes = hashEmittedAssets(outputDirectory);

        expect(assetHashes).toEqual({
            'main.js': sha256("console.log('main');\n"),
            'polyfills.js': sha256("console.log('polyfills');\n"),
            'styles.css': sha256('.mp {\n    color: red;\n}\n'),
            'spy/merchant-portal.js': sha256("console.log('merchant-portal');\n"),
        });
    });

    it('excludes the copied static asset directories so a rebuild never re-hashes them', () => {
        const assetKeys = Object.keys(hashEmittedAssets(outputDirectory));

        expect(assetKeys).not.toContain('assets/ZedUi/src/Spryker/Zed/ZedUi/Presentation/Components/assets/reset.css');
        expect(assetKeys).not.toContain('static/data/legacy-widget.js');
        expect(assetKeys.some((assetKey) => assetKey.startsWith('assets/'))).toBe(false);
        expect(assetKeys.some((assetKey) => assetKey.startsWith('static/'))).toBe(false);
    });

    it('excludes source maps and files that are neither js nor css', () => {
        const assetKeys = Object.keys(hashEmittedAssets(outputDirectory));

        expect(assetKeys).not.toContain('polyfills.js.map');
        expect(assetKeys).not.toContain('spy/merchant-portal.js.map');
        expect(assetKeys).not.toContain('index.html');
    });

    it('produces the same sorted key order on two runs over the same output tree', () => {
        const firstRunKeys = Object.keys(hashEmittedAssets(outputDirectory));
        const secondRunKeys = Object.keys(hashEmittedAssets(outputDirectory));

        expect(secondRunKeys).toEqual(firstRunKeys);
        expect(firstRunKeys).toEqual([...firstRunKeys].sort());
    });
});

describe('writeDevBuildManifest', () => {
    const manifest: DevBuildManifest = {
        buildId: 3,
        assets: { 'styles.css': sha256('.mp {\n    color: red;\n}\n') },
    };

    it('writes a complete, parseable manifest file with the expected shape', () => {
        writeDevBuildManifest(outputDirectory, manifest);

        const written = JSON.parse(readFileSync(join(outputDirectory, MANIFEST_FILENAME), 'utf8'));

        expect(written).toEqual(manifest);
    });

    it('leaves no temp file behind, so a polling client never observes a partial manifest', () => {
        writeDevBuildManifest(outputDirectory, manifest);

        const leftoverTemporaryFiles = readdirSync(outputDirectory).filter((name) => name.endsWith('.tmp'));

        expect(leftoverTemporaryFiles).toEqual([]);
        expect(existsSync(join(outputDirectory, MANIFEST_FILENAME))).toBe(true);
    });

    it('throws an error naming the manifest path, the reason and the next action when the write fails', () => {
        const missingDirectory = join(outputDirectory, 'does-not-exist');
        const expectedManifestPath = join(missingDirectory, MANIFEST_FILENAME);

        expect(() => writeDevBuildManifest(missingDirectory, manifest)).toThrow(expectedManifestPath);
        expect(() => writeDevBuildManifest(missingDirectory, manifest)).toThrow('no such file or directory');
        expect(() => writeDevBuildManifest(missingDirectory, manifest)).toThrow('npm run mp:build:watch');
    });
});

describe('createManifestWriterPlugin', () => {
    it('advances the buildId once per successful compilation', () => {
        const { compiler, fireCompilation } = createFakeCompiler();

        createManifestWriterPlugin({ outputDirectory }).apply?.(compiler);
        fireCompilation(false);
        fireCompilation(false);

        const manifest = JSON.parse(readFileSync(join(outputDirectory, MANIFEST_FILENAME), 'utf8'));

        expect(manifest.buildId).toBe(2);
    });

    it('writes no manifest and does not advance the buildId when the compilation has errors', () => {
        const { compiler, fireCompilation } = createFakeCompiler();

        createManifestWriterPlugin({ outputDirectory }).apply?.(compiler);
        fireCompilation(true);

        expect(existsSync(join(outputDirectory, MANIFEST_FILENAME))).toBe(false);

        fireCompilation(false);

        const manifest = JSON.parse(readFileSync(join(outputDirectory, MANIFEST_FILENAME), 'utf8'));

        expect(manifest.buildId).toBe(1);
    });

    it('reports an actionable message instead of throwing when the manifest cannot be written', () => {
        const missingDirectory = join(outputDirectory, 'does-not-exist');
        const reportedErrors: string[] = [];
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((message: unknown) => {
            reportedErrors.push(String(message));
        });
        const { compiler, fireCompilation } = createFakeCompiler();

        createManifestWriterPlugin({ outputDirectory: missingDirectory }).apply?.(compiler);

        expect(() => fireCompilation(false)).not.toThrow();
        expect(reportedErrors).toHaveLength(1);
        expect(reportedErrors[0]).toContain(join(missingDirectory, MANIFEST_FILENAME));
        expect(reportedErrors[0]).toContain('no such file or directory');
        expect(reportedErrors[0]).toContain('npm run mp:build:watch');

        consoleErrorSpy.mockRestore();
    });
});
