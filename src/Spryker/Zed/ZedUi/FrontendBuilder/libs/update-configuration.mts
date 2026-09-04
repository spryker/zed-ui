import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBuilderSettings, type MerchantPortalBuilderSettings } from '../settings.mts';
import { writeConfigurationFile } from './configuration-file.mts';
import {
    BUILD_CONFIGURATION_FILE_NAME,
    SPEC_CONFIGURATION_FILE_NAME,
    reconcileTypeScriptConfigurations,
    type ReconciledTypeScriptConfiguration,
} from './typescript-configuration.mts';
import { reconcileAngularConfiguration } from './angular-configuration.mts';

const resolveConfigurationPath = (
    reconciledConfigurations: ReconciledTypeScriptConfiguration[],
    fileName: string,
): string => {
    const reconciledConfiguration = reconciledConfigurations.find((candidate) => candidate.fileName === fileName);

    if (reconciledConfiguration === undefined) {
        throw new Error(
            `The Merchant Portal reconciliation did not produce ${fileName}, so angular.json cannot be ` +
                `pointed at it.\n` +
                `angular.json references the TypeScript configurations by the path the reconciliation ` +
                `writes them to, which means every configuration angular.json needs must be part of the ` +
                `reconciliation result.\n` +
                `Add ${fileName} to the configuration plans in libs/typescript-configuration.mts.\n`,
        );
    }

    return reconciledConfiguration.configurationPath;
};

export const updateMerchantPortalConfiguration = async (settings: MerchantPortalBuilderSettings): Promise<void> => {
    const typeScriptConfigurations = await reconcileTypeScriptConfigurations(settings);
    const reconciledConfigurations = [
        ...typeScriptConfigurations,
        await reconcileAngularConfiguration(settings, {
            build: resolveConfigurationPath(typeScriptConfigurations, BUILD_CONFIGURATION_FILE_NAME),
            spec: resolveConfigurationPath(typeScriptConfigurations, SPEC_CONFIGURATION_FILE_NAME),
        }),
    ];

    reconciledConfigurations.forEach(({ filePath, configuration }) => {
        writeConfigurationFile(settings, filePath, configuration);
    });
};

const isInvokedAsScript =
    process.argv[1] !== undefined && basename(process.argv[1]) === basename(fileURLToPath(import.meta.url));

if (isInvokedAsScript) {
    await updateMerchantPortalConfiguration(resolveBuilderSettings());
}
