import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from '@jest/globals';
import {
    PROJECT_SETTINGS_RELATIVE_PATH,
    loadProjectBuilderSettings,
    resolveBuilderSettings,
    type MerchantPortalBuilderSettings,
} from '../settings.mts';
import { toStaticDirectoryPrefix } from '../libs/utils.mts';
import { fixturePath } from './helpers/fixtures.mts';

const BUILDER_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), '..');
const PRINT_SETTINGS_SCRIPT = join(BUILDER_DIRECTORY, '__tests__/helpers/print-project-settings.mts');
const SETTINGS_URL = pathToFileURL(join(BUILDER_DIRECTORY, 'settings.mts')).href;
const temporaryRoots: string[] = [];

// The lockfile is what the project root is found by, the marker what the layout is detected from.
const createProjectRoot = (): string => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'merchant-portal-settings-')));
    temporaryRoots.push(root);
    writeFileSync(join(root, 'package-lock.json'), '{}\n');
    mkdirSync(join(root, 'vendor/spryker'), { recursive: true });

    return root;
};

const writeProjectSettings = (context: string, source: string): void => {
    mkdirSync(dirname(join(context, PROJECT_SETTINGS_RELATIVE_PATH)), { recursive: true });
    writeFileSync(join(context, PROJECT_SETTINGS_RELATIVE_PATH), source);
};

const loadInChildProcess = (context: string): SpawnSyncReturns<string> =>
    spawnSync(process.execPath, [PRINT_SETTINGS_SCRIPT], { cwd: context, encoding: 'utf8' });

afterEach(() => {
    while (temporaryRoots.length > 0) {
        rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
});

describe('project settings overrides', () => {
    it('registers a further project namespace next to the default one', () => {
        const settings = resolveBuilderSettings(fixturePath('project-layout'), {
            paths: { projectModulesDirectories: { acme: './src/Acme/Zed' } },
        });

        expect(settings.layout.projectModulesDirectories).toEqual({ pyz: './src/Pyz/Zed', acme: './src/Acme/Zed' });
        expect(settings.paths.projectModulesDirectories).toEqual([
            join(fixturePath('project-layout'), 'src/Pyz/Zed'),
            join(fixturePath('project-layout'), 'src/Acme/Zed'),
        ]);
    });

    it('replaces the default namespace when the override reuses its key', () => {
        const settings = resolveBuilderSettings(fixturePath('project-layout'), {
            paths: { projectModulesDirectories: { pyz: './src/Acme/Zed' } },
        });

        expect(settings.layout.projectModulesDirectories).toEqual({ pyz: './src/Acme/Zed' });
    });

    it('moves the application directory while keeping the rest of the detected layout', () => {
        const settings = resolveBuilderSettings(fixturePath('project-layout'), {
            paths: { projectApplicationDirectory: './src/Acme/Zed/ZedUi/Presentation/Components' },
        });

        expect(settings.layout.projectApplicationDirectory).toBe('./src/Acme/Zed/ZedUi/Presentation/Components');
        expect(settings.layout.coreModulesDirectory).toBe('./vendor/spryker');
        expect(settings.layout.projectModulesDirectories).toEqual({ pyz: './src/Pyz/Zed' });
    });
});

describe('loading the project settings file', () => {
    it('falls back to the packaged defaults when the project has no settings file', async () => {
        const settings = await loadProjectBuilderSettings(fixturePath('project-layout'));

        expect(settings).toEqual(resolveBuilderSettings(fixturePath('project-layout')));
    });

    it('applies the overrides the file exports through defineConfig', () => {
        const context = createProjectRoot();
        writeProjectSettings(
            context,
            `import { defineConfig } from '${SETTINGS_URL}';\n\n` +
                `export default defineConfig({\n` +
                `    paths: {\n` +
                `        projectModulesDirectories: { acme: './src/Acme/Zed' },\n` +
                `        projectApplicationDirectory: './src/Acme/Zed/ZedUi/Presentation/Components',\n` +
                `    },\n` +
                `});\n`,
        );

        const result = loadInChildProcess(context);

        expect(result.stderr).toBe('');
        const settings = JSON.parse(result.stdout) as MerchantPortalBuilderSettings;
        expect(settings.context).toBe(context);
        expect(settings.layout.projectModulesDirectories).toEqual({ pyz: './src/Pyz/Zed', acme: './src/Acme/Zed' });
        expect(settings.layout.projectApplicationDirectory).toBe('./src/Acme/Zed/ZedUi/Presentation/Components');
        expect(settings.paths.projectModulesDirectories).toEqual([
            join(context, 'src/Pyz/Zed'),
            join(context, 'src/Acme/Zed'),
        ]);
    });

    it('names the file, the reason and the next action when it does not export builder settings', () => {
        const context = createProjectRoot();
        writeProjectSettings(context, 'export default { paths: {} };\n');

        const result = loadInChildProcess(context);

        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain(join(context, PROJECT_SETTINGS_RELATIVE_PATH));
        expect(result.stderr).toMatch(/do not export builder settings/);
        expect(result.stderr).toMatch(/defineConfig/);
    });

    it('names the file and the erasable-syntax constraint when the file fails to load', () => {
        const context = createProjectRoot();
        writeProjectSettings(context, 'enum Broken { A }\nexport default Broken;\n');

        const result = loadInChildProcess(context);

        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain(join(context, PROJECT_SETTINGS_RELATIVE_PATH));
        expect(result.stderr).toMatch(/erasable TypeScript syntax/);
    });
});

describe('the jest root of a module directory pattern', () => {
    it.each([
        ['./src/Pyz/*/src/Pyz/Zed', 'src/Pyz'],
        ['./src/Pyz/Zed', 'src/Pyz/Zed'],
        ['src/{Acme,Pyz}/Zed', 'src'],
    ])('cuts %s at its first wildcard segment into %s', (directoryPattern, expectedPrefix) => {
        expect(toStaticDirectoryPrefix(directoryPattern)).toBe(expectedPrefix);
    });
});
