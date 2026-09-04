import type { CustomWebpackBrowserSchema, TargetOptions } from '@angular-builders/custom-webpack';
import type { Configuration } from 'webpack';
import { resolveBuilderSettings } from './settings.mts';
import { discoverEntryPoints } from './libs/entry-points.mts';
import { applyDevelopmentWatchReload } from './libs/reload/development-watch.mts';

export default async (
    config: Configuration,
    options: CustomWebpackBrowserSchema,
    targetOptions: TargetOptions,
): Promise<Configuration> => {
    const settings = resolveBuilderSettings();

    console.log('Resolving entry points...');

    const { entryPointsMap, entryPointFiles } = await discoverEntryPoints(settings);

    console.log(`Found ${entryPointFiles.length} entry point file(s) in ${settings.layout.name}!`);

    config.entry = {
        ...(config.entry as Record<string, string>),
        ...entryPointsMap,
    };

    config.resolve = {
        ...config.resolve,
        alias: {
            '~@spryker': settings.paths.sprykerPackagesDirectory,
            '~@angular': settings.paths.angularPackagesDirectory,
        },
    };

    config.output = {
        ...config.output,
        publicPath: settings.urls.assetsPublicPath,
    };

    applyDevelopmentWatchReload({ config, options, targetOptions, settings });

    return config;
};
