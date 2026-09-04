import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBuilderSettings } from './settings.mts';

const settings = resolveBuilderSettings();

// The setup file ships with the builder, and the directories the sources live in differ per source
// layout, so both are resolved instead of written out.
const setupFilePath = fileURLToPath(new URL('./test-setup.ts', import.meta.url));

export default {
    displayName: 'merchant-portal',
    preset: 'jest-preset-angular',
    setupFilesAfterEnv: [setupFilePath],
    roots: [join(settings.context, 'src/Pyz'), settings.paths.coreModulesDirectory],
    testMatch: ['**/+(*.)+(spec|test).+(ts|js)?(x)'],
    moduleFileExtensions: ['ts', 'js', 'html'],
    passWithNoTests: true,
    testPathIgnorePatterns: ['/node_modules/', '/FrontendBuilder/__tests__/'],
};
