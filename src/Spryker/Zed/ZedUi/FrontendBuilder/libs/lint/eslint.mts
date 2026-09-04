import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBuilderSettings } from '../../settings.mts';

const LINTED_FILE_EXTENSIONS = '{ts,html}';
const PROJECT_CONFIGURATION_FILE_NAME = 'eslint.config.mp.mjs';

const settings = resolveBuilderSettings();

// The directories the Merchant Portal sources live in differ per source layout, so the patterns are
// built from the resolved paths rather than written out. They stay relative to the project root
// because that is the working directory eslint reports against.
const toProjectPattern = (absoluteDirectory: string, glob: string): string =>
    `./${relative(settings.context, absoluteDirectory)}/${glob}`;

const filePatterns = [
    toProjectPattern(
        settings.paths.coreModulesDirectory,
        `*/src/Spryker/Zed/*/Presentation/Components/**/*.${LINTED_FILE_EXTENSIONS}`,
    ),
    toProjectPattern(
        settings.paths.projectModulesDirectory,
        `*/Presentation/Components/**/*.${LINTED_FILE_EXTENSIONS}`,
    ),
];

const projectConfigPath = join(settings.context, PROJECT_CONFIGURATION_FILE_NAME);
const packagedConfigPath = fileURLToPath(new URL('./eslint.config.mjs', import.meta.url));

if (!existsSync(packagedConfigPath) && !existsSync(projectConfigPath)) {
    process.stderr.write(
        `ESLint configuration could not be resolved (offending path: ${packagedConfigPath}).\n` +
            `The packaged default is missing, which means the shipped ZedUi builder is incomplete.\n` +
            `Restore FrontendBuilder/libs/lint/eslint.config.mjs in the ZedUi package, or add a ` +
            `project-root override at ${projectConfigPath}.\n`,
    );
    process.exit(1);
}

const configPath = existsSync(projectConfigPath) ? projectConfigPath : packagedConfigPath;

// The eslint executable is used rather than its Node API: the API resolves and type-checks every
// pattern eagerly, which turns an 11-second run into minutes on the Merchant Portal tree.
const result = spawnSync(
    'npx',
    ['eslint', '--no-config-lookup', '--config', configPath, '--no-error-on-unmatched-pattern', ...filePatterns],
    { cwd: settings.context, stdio: 'inherit' },
);

if (result.error !== undefined) {
    process.stderr.write(
        `ESLint could not be started for the Merchant Portal sources (${filePatterns.join(', ')}).\n` +
            `Reason: ${result.error.message}\n` +
            `Install dependencies so "npx eslint" resolves, then re-run "npm run mp:lint".\n`,
    );
    process.exit(1);
}

process.exit(result.status ?? 1);
