import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from '@jest/globals';
import {
    BUILD_CONFIGURATION_PATH,
    readGeneratedBuildConfiguration,
    resolveBuilderSettings,
    type GeneratedBuildConfiguration,
} from '../settings.mts';

const temporaryRoots: string[] = [];

// A monorepo-shaped project: the Spryker sources (with the ZedUi module) in src/, two project namespaces.
const createContext = (): string => {
    const context = mkdtempSync(join(tmpdir(), 'mp-build-configuration-'));
    temporaryRoots.push(context);
    ['src/Spryker/ZedUi/src/Spryker/Zed/ZedUi', 'src/Pyz', 'src/Acme'].forEach((directory) =>
        mkdirSync(join(context, directory), { recursive: true }),
    );

    return context;
};

const writeFile = (context: string, relativePath: string, content: unknown): string => {
    const filePath = join(context, relativePath);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content));

    return filePath;
};

const generated: GeneratedBuildConfiguration = {
    coreNamespaces: ['SprykerShop', 'SprykerFeature', 'SprykerEco', 'Spryker', 'SprykerSdk'],
    projectNamespaces: ['Acme', 'Pyz'],
};

afterEach(() => {
    while (temporaryRoots.length > 0) {
        rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
});

describe('reading the generated build configuration', () => {
    it('returns null when the backend has not written the file, so the built-in layout stays', () => {
        expect(readGeneratedBuildConfiguration(createContext())).toBeNull();
    });

    it('fails when the file is not valid JSON', () => {
        const context = createContext();
        writeFile(context, BUILD_CONFIGURATION_PATH, '{ not json');

        expect(() => readGeneratedBuildConfiguration(context)).toThrow(SyntaxError);
    });

    it('fails naming the file when the namespace lists are missing', () => {
        const context = createContext();
        const filePath = writeFile(context, BUILD_CONFIGURATION_PATH, { projectNamespaces: ['Pyz'] });

        expect(() => readGeneratedBuildConfiguration(context)).toThrow(filePath);
        expect(() => readGeneratedBuildConfiguration(context)).toThrow('"coreNamespaces" and "projectNamespaces"');
    });
});

describe('the builder settings with a generated build configuration', () => {
    it('keep the detected layout without a file', () => {
        const context = createContext();

        const settings = resolveBuilderSettings(context);

        expect(settings.layout.projectModulesDirectories).toEqual({ pyz: './src/Pyz/*/src/Pyz/Zed' });
        expect(settings.buildConfigurationSource).toContain('built-in defaults');
    });

    it('scan every namespace weakest first, src/ when the repository holds it and vendor/ otherwise, project namespaces last in both shapes', () => {
        const context = createContext();
        mkdirSync(join(context, 'src/SprykerFeature'), { recursive: true });
        writeFile(context, BUILD_CONFIGURATION_PATH, generated);

        const settings = resolveBuilderSettings(context);

        expect(settings.layout.coreModulesDirectory).toBe('./src/Spryker');
        expect(settings.layout.ownsCoreModules).toBe(true);
        expect(settings.layout.coreModulesDirectories).toEqual({
            sprykersdk: './vendor/spryker-sdk',
            spryker: './src/Spryker',
            sprykereco: './vendor/spryker-eco',
            sprykerfeature: './src/SprykerFeature',
            sprykershop: './vendor/spryker-shop',
        });
        expect(settings.layout.projectModulesDirectories).toEqual({
            'pyz/Zed': './src/Pyz/Zed',
            pyz: './src/Pyz/*/src/Pyz/Zed',
            'acme/Zed': './src/Acme/Zed',
            acme: './src/Acme/*/src/Acme/Zed',
        });
        expect(settings.buildConfigurationSource).toBe(`generated (${join(context, BUILD_CONFIGURATION_PATH)})`);
    });

    it('resolve the Spryker core modules, where ZedUi lives, to vendor/spryker in a project checkout', () => {
        const context = createContext();
        rmSync(join(context, 'src/Spryker'), { recursive: true });
        mkdirSync(join(context, 'vendor/spryker'), { recursive: true });
        writeFile(context, BUILD_CONFIGURATION_PATH, generated);

        const settings = resolveBuilderSettings(context);

        expect(settings.layout.coreModulesDirectory).toBe('./vendor/spryker');
        expect(settings.layout.ownsCoreModules).toBe(false);
    });

    it('take the Angular application files from the strongest project namespace that has them', () => {
        const context = createContext();
        writeFile(context, BUILD_CONFIGURATION_PATH, generated);
        mkdirSync(join(context, 'src/Acme/Zed/ZedUi/Presentation/Components'), { recursive: true });
        mkdirSync(join(context, 'src/Pyz/ZedUi/src/Pyz/Zed/ZedUi/Presentation/Components'), { recursive: true });

        expect(resolveBuilderSettings(context).layout.projectApplicationDirectory).toBe(
            './src/Acme/Zed/ZedUi/Presentation/Components',
        );
    });

    it('keep the default application directory when no project namespace has one', () => {
        const context = createContext();
        writeFile(context, BUILD_CONFIGURATION_PATH, generated);

        expect(resolveBuilderSettings(context).layout.projectApplicationDirectory).toBe(
            './src/Pyz/ZedUi/src/Pyz/Zed/ZedUi/Presentation/Components',
        );
    });

    it('fail naming the file when the Spryker namespace is missing', () => {
        const context = createContext();
        const filePath = writeFile(context, BUILD_CONFIGURATION_PATH, { ...generated, coreNamespaces: ['SprykerEco'] });

        expect(() => resolveBuilderSettings(context)).toThrow(filePath);
        expect(() => resolveBuilderSettings(context)).toThrow('"Spryker"');
    });

    it('keep the directories a project settings file registered, after the generated ones', () => {
        const context = createContext();
        writeFile(context, BUILD_CONFIGURATION_PATH, generated);

        const settings = resolveBuilderSettings(context, {
            paths: { projectModulesDirectories: { beta: './src/Beta/Zed' } },
        });

        expect(Object.entries(settings.layout.projectModulesDirectories).at(-1)).toEqual(['beta', './src/Beta/Zed']);
    });
});
