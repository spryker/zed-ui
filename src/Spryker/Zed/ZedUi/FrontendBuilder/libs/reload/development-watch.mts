import { join } from 'node:path';
import type { Configuration, EntryObject } from 'webpack';
import type { CustomWebpackBrowserSchema, TargetOptions } from '@angular-builders/custom-webpack';
import { MANIFEST_FILENAME, createManifestWriterPlugin } from './manifest-writer.mts';
import { compileReloadClient } from './client-compiler.mts';
import type { MerchantPortalBuilderSettings } from '../../settings.mts';

const PRODUCTION_CONFIGURATION_NAME = 'production';

const RELOAD_CLIENT_HOST_ENTRY_NAME = 'polyfills';

export interface DevelopmentWatchReloadOptions {
    config: Configuration;
    options: CustomWebpackBrowserSchema;
    targetOptions: TargetOptions;
    settings: MerchantPortalBuilderSettings;
}

const isDevelopmentWatchBuild = (options: CustomWebpackBrowserSchema, targetOptions: TargetOptions): boolean =>
    options.watch === true && targetOptions.configuration !== PRODUCTION_CONFIGURATION_NAME;

const resolveOutputDirectory = (
    options: CustomWebpackBrowserSchema,
    settings: MerchantPortalBuilderSettings,
): string => {
    const outputDirectoryFromBuilder = join(settings.context, options.outputPath);

    if (outputDirectoryFromBuilder !== settings.paths.outputDirectory) {
        throw new Error(
            `The Merchant Portal live-reload manifest cannot be placed: the "outputPath" of the ` +
                `merchant-portal build target resolves to ${outputDirectoryFromBuilder}, but ` +
                `settings.paths.outputDirectory in ` +
                `src/Spryker/ZedUi/src/Spryker/Zed/ZedUi/FrontendBuilder/settings.mts says ` +
                `${settings.paths.outputDirectory}. The two must name the same directory, otherwise the ` +
                `browser would poll a manifest URL that nothing writes to. ` +
                `Update settings.mts to match angular.json (or revert the angular.json change).`,
        );
    }

    return outputDirectoryFromBuilder;
};

const prependReloadClientToHostEntry = (config: Configuration, reloadClientPath: string): void => {
    const entry = config.entry as EntryObject;
    const hostEntry = entry[RELOAD_CLIENT_HOST_ENTRY_NAME];

    if (typeof hostEntry !== 'string' && !Array.isArray(hostEntry)) {
        throw new Error(
            `Cannot inject the Merchant Portal reload client into the "${RELOAD_CLIENT_HOST_ENTRY_NAME}" ` +
                `webpack entry: it is ${JSON.stringify(hostEntry)}, but only a file path or an array of ` +
                `file paths can be prepended to. ` +
                `The entry is produced by @angular-devkit/build-angular, so this most likely means the ` +
                `Angular build changed its entry shape — update ` +
                `src/Spryker/ZedUi/src/Spryker/Zed/ZedUi/FrontendBuilder/libs/reload/development-watch.mts ` +
                `to handle the new shape.`,
        );
    }

    config.entry = {
        ...entry,
        [RELOAD_CLIENT_HOST_ENTRY_NAME]: [reloadClientPath, ...(Array.isArray(hostEntry) ? hostEntry : [hostEntry])],
    };
};

export const applyDevelopmentWatchReload = ({
    config,
    options,
    targetOptions,
    settings,
}: DevelopmentWatchReloadOptions): void => {
    if (!isDevelopmentWatchBuild(options, targetOptions)) {
        return;
    }

    const outputDirectory = resolveOutputDirectory(options, settings);
    const reloadManifestUrl = `${settings.urls.assetsPublicPath}${MANIFEST_FILENAME}`;

    prependReloadClientToHostEntry(config, compileReloadClient({ context: settings.context, reloadManifestUrl }));

    config.plugins = [...(config.plugins ?? []), createManifestWriterPlugin({ outputDirectory })];

    console.log(`Live reload enabled: the browser polls ${reloadManifestUrl} once per second.`);
};
