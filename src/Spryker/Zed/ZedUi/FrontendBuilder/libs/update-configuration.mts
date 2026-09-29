import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectBuilderSettings, type MerchantPortalBuilderSettings } from '../settings.mts';
import { writeConfigurationFile } from './configuration-file.mts';
import type { SolutionReconciliation } from './solution-configuration.mts';
import {
    BUILD_CONFIGURATION_FILE_NAME,
    SPEC_CONFIGURATION_FILE_NAME,
    reconcileDefaultsConfiguration,
    reconcileProjectSolution,
    reconcileTypeScriptConfigurations,
    type ReconciledTypeScriptConfiguration,
} from './typescript-configuration.mts';
import { reconcileAngularConfiguration } from './angular-configuration.mts';

export const applySolutionReconciliation = (
    settings: MerchantPortalBuilderSettings,
    reconciliation: SolutionReconciliation,
): void => {
    if (reconciliation.status === 'projectOwned') {
        console.log(reconciliation.notice);

        return;
    }

    if (reconciliation.status === 'unchanged') {
        return;
    }

    writeConfigurationFile(reconciliation.filePath, reconciliation.configuration);
};

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
    const defaultsConfiguration = await reconcileDefaultsConfiguration(settings);

    // Both files are what the build configuration extends, so they exist before it is written.
    applySolutionReconciliation(settings, await reconcileProjectSolution(settings));
    writeConfigurationFile(defaultsConfiguration.filePath, defaultsConfiguration.configuration);

    reconciledConfigurations.forEach(({ filePath, configuration }) => {
        writeConfigurationFile(filePath, configuration);
    });
};

const isInvokedAsScript =
    process.argv[1] !== undefined && basename(process.argv[1]) === basename(fileURLToPath(import.meta.url));

if (isInvokedAsScript) {
    await updateMerchantPortalConfiguration(await loadProjectBuilderSettings());
}
