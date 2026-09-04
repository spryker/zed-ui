import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Configuration, EntryObject, WebpackPluginInstance } from 'webpack';
import type { CustomWebpackBrowserSchema, TargetOptions } from '@angular-builders/custom-webpack';
import { applyDevelopmentWatchReload } from '../libs/reload/development-watch.mts';
import { MANIFEST_FILENAME } from '../libs/reload/manifest-writer.mts';
import type { MerchantPortalBuilderSettings } from '../settings.mts';

const OUTPUT_PATH_FROM_ANGULAR_JSON = 'public/MerchantPortal/assets/js';

const basePlugin: WebpackPluginInstance = { apply: () => undefined };

const basePolyfillsEntry = ['/abs/polyfills.ts'];

const createBaseConfiguration = (): Configuration => ({
    entry: {
        main: ['/abs/main.ts'],
        polyfills: [...basePolyfillsEntry],
    },
    plugins: [basePlugin],
});

const createBuildOptions = (watch: boolean): CustomWebpackBrowserSchema =>
    ({
        watch,
        outputPath: OUTPUT_PATH_FROM_ANGULAR_JSON,
    }) as unknown as CustomWebpackBrowserSchema;

const createTargetOptions = (configuration: string): TargetOptions =>
    ({
        project: 'merchant-portal',
        target: 'build',
        configuration,
    }) as unknown as TargetOptions;

let context: string;
let settings: MerchantPortalBuilderSettings;
let consoleLogSpy: ReturnType<typeof jest.spyOn>;

beforeEach(() => {
    context = mkdtempSync(join(tmpdir(), 'merchant-portal-watch-injection-'));
    settings = {
        context,
        paths: { outputDirectory: join(context, 'public', 'MerchantPortal', 'assets', 'js') },
        urls: { assetsPublicPath: '/assets/js/' },
    } as unknown as MerchantPortalBuilderSettings;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
    consoleLogSpy.mockRestore();
    rmSync(context, { recursive: true, force: true });
});

describe('applyDevelopmentWatchReload on the development-watch path', () => {
    it('prepends the transpiled reload client to the polyfills entry, keeping the base entries after it', () => {
        const config = createBaseConfiguration();

        applyDevelopmentWatchReload({
            config,
            options: createBuildOptions(true),
            targetOptions: createTargetOptions(''),
            settings,
        });

        const polyfillsEntry = (config.entry as EntryObject).polyfills as string[];

        expect(polyfillsEntry[0]).toBe(join(context, '.angular', 'merchant-portal-dev-reload', 'reload-client.js'));
        expect(polyfillsEntry.slice(1)).toEqual(basePolyfillsEntry);
    });

    it('emits the reload client as plain javascript next to the sibling module it imports', () => {
        const config = createBaseConfiguration();

        applyDevelopmentWatchReload({
            config,
            options: createBuildOptions(true),
            targetOptions: createTargetOptions(''),
            settings,
        });

        const generatedDirectory = join(context, '.angular', 'merchant-portal-dev-reload');
        const emittedClient = readFileSync(join(generatedDirectory, 'reload-client.js'), 'utf8');

        expect(existsSync(join(generatedDirectory, 'reload-state.js'))).toBe(true);
        expect(emittedClient).toContain("from './reload-state.js'");
        expect(emittedClient).toContain('classifyManifestDiff');
        expect(emittedClient).not.toContain(': DevBuildManifest');
    });

    it('keeps the base plugins and adds exactly the manifest writer plugin', () => {
        const config = createBaseConfiguration();

        applyDevelopmentWatchReload({
            config,
            options: createBuildOptions(true),
            targetOptions: createTargetOptions(''),
            settings,
        });

        const plugins = config.plugins ?? [];

        expect(plugins).toContain(basePlugin);
        expect(plugins).toHaveLength(2);
    });

    it('compiles the manifest url served under the assets public path into the client', () => {
        const config = createBaseConfiguration();

        applyDevelopmentWatchReload({
            config,
            options: createBuildOptions(true),
            targetOptions: createTargetOptions(''),
            settings,
        });

        const emittedClient = readFileSync(
            join(context, '.angular', 'merchant-portal-dev-reload', 'reload-client.js'),
            'utf8',
        );

        expect(emittedClient).toContain(
            `const __RELOAD_MANIFEST_URL__ = ${JSON.stringify(`/assets/js/${MANIFEST_FILENAME}`)};`,
        );
    });

    it('reports the offending output paths and the fix when angular.json and settings.mts disagree', () => {
        const config = createBaseConfiguration();
        const options = { watch: true, outputPath: 'public/Somewhere/else' } as unknown as CustomWebpackBrowserSchema;

        expect(() =>
            applyDevelopmentWatchReload({
                config,
                options,
                targetOptions: createTargetOptions(''),
                settings,
            }),
        ).toThrow(join(context, 'public', 'Somewhere', 'else'));
        expect(() =>
            applyDevelopmentWatchReload({
                config,
                options,
                targetOptions: createTargetOptions(''),
                settings,
            }),
        ).toThrow('Update settings.mts to match angular.json');
    });

    it('reports the offending entry and the fix when the polyfills entry is not a file path list', () => {
        const config: Configuration = {
            entry: { polyfills: { import: ['/abs/polyfills.ts'] } },
            plugins: [],
        };

        expect(() =>
            applyDevelopmentWatchReload({
                config,
                options: createBuildOptions(true),
                targetOptions: createTargetOptions(''),
                settings,
            }),
        ).toThrow('"polyfills" webpack entry');
        expect(() =>
            applyDevelopmentWatchReload({
                config,
                options: createBuildOptions(true),
                targetOptions: createTargetOptions(''),
                settings,
            }),
        ).toThrow('development-watch.mts');
    });
});

describe('applyDevelopmentWatchReload outside the development-watch path', () => {
    const untouchedBuildPaths: [string, CustomWebpackBrowserSchema, TargetOptions][] = [
        ['plain development build (npm run mp:build)', createBuildOptions(false), createTargetOptions('')],
        [
            'production build (npm run mp:build:production)',
            createBuildOptions(false),
            createTargetOptions('production'),
        ],
        ['production build with --watch', createBuildOptions(true), createTargetOptions('production')],
    ];

    it.each(untouchedBuildPaths)('injects nothing into a %s', (_name, options, targetOptions) => {
        const config = createBaseConfiguration();

        applyDevelopmentWatchReload({ config, options, targetOptions, settings });

        expect((config.entry as EntryObject).polyfills).toEqual(basePolyfillsEntry);
        expect(config.plugins).toEqual([basePlugin]);
        expect(existsSync(join(context, '.angular'))).toBe(false);
    });
});
