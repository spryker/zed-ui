import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { type MerchantPortalBuilderSettings } from '../settings.mts';
import { matchesConfigurationPathTemplate } from './utils.mts';

export interface ReconciledConfiguration<TConfiguration> {
    fileName: string;
    filePath: string;
    configuration: TConfiguration;
    wasCreated: boolean;
}

export const readConfigurationFile = <TConfiguration,>(filePath: string): TConfiguration | null => {
    if (!existsSync(filePath)) {
        return null;
    }

    try {
        return JSON.parse(readFileSync(filePath, { encoding: 'utf8' })) as TConfiguration;
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);

        throw new Error(
            `Cannot read the Merchant Portal configuration ${filePath}: ${reason}.\n` +
                `The builder regenerates the layout-dependent sections of this file in place, so it must ` +
                `contain valid JSON without comments or trailing commas.\n` +
                `Fix the JSON syntax, or delete the file and run "npm run mp:update:config" to have it ` +
                `written from scratch.\n`,
        );
    }
};

export const writeConfigurationFile = (
    settings: MerchantPortalBuilderSettings,
    filePath: string,
    configuration: unknown,
): void => {
    writeFileSync(filePath, `${JSON.stringify(configuration, null, 4)}\n`);

    const formatterResult = spawnSync('npx', ['prettier', '--write', filePath], {
        stdio: 'inherit',
        cwd: settings.context,
    });

    if (formatterResult.error !== undefined || formatterResult.status !== 0) {
        const reason =
            formatterResult.error !== undefined
                ? formatterResult.error.message
                : `prettier exited with status ${formatterResult.status}.`;

        throw new Error(
            `Failed to format ${filePath} after regenerating the Merchant Portal configuration.\n` +
                `Reason: ${reason}\n` +
                `The configuration itself was written correctly, so the file is usable but may not match ` +
                `the repository formatting. Run "npx prettier --write ${filePath}", or install ` +
                `dependencies so "npx prettier" resolves, then re-run "npm run mp:update:config".\n`,
        );
    }
};

export const matchesAnyPathTemplate = (configurationPath: string, pathTemplates: string[]): boolean =>
    pathTemplates.some((pathTemplate) => matchesConfigurationPathTemplate(configurationPath, pathTemplate));

// The generated entries come first and the entries the project added itself follow, so regenerating
// an untouched file is a no-op and a project addition is never lost.
export const reconcileEntryList = <TEntry,>(
    existingEntries: TEntry[] | undefined,
    generatedEntries: TEntry[],
    isGeneratedEntry: (entry: TEntry) => boolean,
): TEntry[] => {
    const generatedKeys = generatedEntries.map((entry) => JSON.stringify(entry));
    const projectEntries = (existingEntries ?? []).filter(
        (existingEntry) => !generatedKeys.includes(JSON.stringify(existingEntry)) && !isGeneratedEntry(existingEntry),
    );

    return [...generatedEntries, ...projectEntries];
};
