import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectBuilderSettings } from './settings.mts';
import { toStaticDirectoryPrefix } from './libs/utils.mts';

const settings = await loadProjectBuilderSettings();

// The setup file ships with the builder, and the directories the sources live in differ per source
// layout, so both are resolved instead of written out.
const setupFilePath = fileURLToPath(new URL('./test-setup.ts', import.meta.url));

export default {
    displayName: 'merchant-portal',
    preset: 'jest-preset-angular',
    setupFilesAfterEnv: [setupFilePath],
    // Jest roots are directories, so a module directory pattern is cut at its first wildcard.
    roots: [
        ...Object.values(settings.layout.projectModulesDirectories).map((directory) =>
            join(settings.context, toStaticDirectoryPrefix(directory)),
        ),
        settings.paths.coreModulesDirectory,
    ],
    testMatch: ['**/+(*.)+(spec|test).+(ts|js)?(x)'],
    moduleFileExtensions: ['ts', 'js', 'html'],
    passWithNoTests: true,
    testPathIgnorePatterns: ['/node_modules/', '/FrontendBuilder/__tests__/'],
};
