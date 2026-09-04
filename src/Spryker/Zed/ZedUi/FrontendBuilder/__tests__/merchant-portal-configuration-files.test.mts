import { describe, it, expect } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { resolveBuilderSettings, resolveProjectRoot } from '../settings.mts';
import {
    BUILD_CONFIGURATION_FILE_NAME,
    LINT_CONFIGURATION_FILE_NAME,
    SPEC_CONFIGURATION_FILE_NAME,
    reconcileTypeScriptConfigurations,
    type ReconciledTypeScriptConfiguration,
} from '../libs/typescript-configuration.mts';
import { ANGULAR_CONFIGURATION_FILE_NAME, reconcileAngularConfiguration } from '../libs/angular-configuration.mts';

// This project keeps no TypeScript configuration in its root, so all three are generated inside the
// builder. angular.json stays at the root because the Angular CLI only finds it by walking up.
const PROJECT_ROOT_CONFIGURATION_FILES = [ANGULAR_CONFIGURATION_FILE_NAME];
const BUILDER_CONFIGURATION_FILES = [
    BUILD_CONFIGURATION_FILE_NAME,
    SPEC_CONFIGURATION_FILE_NAME,
    LINT_CONFIGURATION_FILE_NAME,
];

const readConfigurationAt = (filePath: string): Record<string, unknown> =>
    JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;

const collectStringValues = (value: unknown): string[] => {
    if (typeof value === 'string') {
        return [value];
    }

    if (Array.isArray(value)) {
        return value.flatMap(collectStringValues);
    }

    if (value !== null && typeof value === 'object') {
        return Object.values(value).flatMap(collectStringValues);
    }

    return [];
};

const reconcileProjectConfigurations = async (): Promise<
    { fileName: string; filePath: string; configuration: unknown }[]
> => {
    const settings = resolveBuilderSettings();
    const typeScriptConfigurations = await reconcileTypeScriptConfigurations(settings);
    const pathOf = (fileName: string): string =>
        (
            typeScriptConfigurations.find(
                (candidate) => candidate.fileName === fileName,
            ) as ReconciledTypeScriptConfiguration
        ).configurationPath;

    return [
        ...typeScriptConfigurations,
        await reconcileAngularConfiguration(settings, {
            build: pathOf(BUILD_CONFIGURATION_FILE_NAME),
            spec: pathOf(SPEC_CONFIGURATION_FILE_NAME),
        }),
    ];
};

describe('where the Merchant Portal configuration files live', () => {
    it.each(PROJECT_ROOT_CONFIGURATION_FILES)('%s lives at the project root', (configurationFileName) => {
        expect(existsSync(join(resolveProjectRoot(), configurationFileName))).toBe(true);
    });

    // A project-owned file must not depend on where the core modules are installed, so no path in it
    // may climb out of the project root.
    it.each(PROJECT_ROOT_CONFIGURATION_FILES)(
        '%s references nothing above the project root',
        (configurationFileName) => {
            const climbingPaths = collectStringValues(
                readConfigurationAt(join(resolveProjectRoot(), configurationFileName)),
            ).filter((referencedPath) => referencedPath.includes('../'));

            expect(climbingPaths).toEqual([]);
        },
    );

    it.each(BUILDER_CONFIGURATION_FILES)(
        '%s is generated inside the builder, not at the project root',
        async (configurationFileName) => {
            const reconciledConfigurations = await reconcileProjectConfigurations();
            const reconciledConfiguration = reconciledConfigurations.find(
                (candidate) => candidate.fileName === configurationFileName,
            );

            expect(reconciledConfiguration?.filePath).toBe(
                join(
                    resolveProjectRoot(),
                    'src/Spryker/ZedUi/src/Spryker/Zed/ZedUi/FrontendBuilder',
                    configurationFileName,
                ),
            );
            expect(existsSync(join(resolveProjectRoot(), configurationFileName))).toBe(false);
        },
    );

    // These two do climb, because they are written outside the root and every path the builder
    // computes is relative to it. What must hold is that the ladder lands back inside the project.
    it.each(BUILDER_CONFIGURATION_FILES)('%s only climbs back into the project root', async (configurationFileName) => {
        const reconciledConfigurations = await reconcileProjectConfigurations();
        const reconciledConfiguration = reconciledConfigurations.find(
            (candidate) => candidate.fileName === configurationFileName,
        );
        const configurationDirectory = join(reconciledConfiguration?.filePath ?? '', '..');
        const escapingPaths = collectStringValues(reconciledConfiguration?.configuration)
            .filter((referencedPath) => referencedPath.includes('../'))
            .filter((referencedPath) =>
                relative(resolveProjectRoot(), resolve(configurationDirectory, referencedPath)).startsWith('..'),
            );

        expect(escapingPaths).toEqual([]);
    });
});

// The layout-dependent parts of these files are generated, because their paths depend on where the
// core modules are installed. Everything else stays project-owned. A difference here means a
// generated value was edited by hand, or a core module was added without regenerating: run
// "npm run mp:update:config".
describe('Merchant Portal configuration files on disk', () => {
    it('hold the generated values the generator would write today', async () => {
        const reconciledConfigurations = await reconcileProjectConfigurations();

        reconciledConfigurations.forEach(({ fileName, filePath, configuration }) => {
            expect({ fileName, configuration }).toEqual({
                fileName,
                configuration: readConfigurationAt(filePath),
            });
        });
    });
});
