import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { program } from 'commander';
import stylelint from 'stylelint';
import { resolveBuilderSettings } from '../../settings.mts';

const settings = resolveBuilderSettings();

program
    .option('-f, --fix', 'execute stylelint in the fix mode.')
    .option('-p, --file-path <path>', 'execute stylelint only for this file.')
    .parse(process.argv);

const commandLineOptions = program.opts();

const isFixMode = !!commandLineOptions.fix;
const defaultFilePaths = [`${settings.paths.projectModulesDirectory}/${settings.globs.projectStyleSheetFiles}`];
const filePaths = commandLineOptions.filePath ? [commandLineOptions.filePath] : defaultFilePaths;

const projectConfigPath = join(settings.context, '.stylelintrc.mp.js');
const packagedConfigPath = fileURLToPath(new URL('./stylelint.config.mjs', import.meta.url));

let configFile;
if (existsSync(projectConfigPath)) {
    configFile = projectConfigPath;
} else if (existsSync(packagedConfigPath)) {
    configFile = packagedConfigPath;
} else {
    process.stderr.write(
        `Stylelint configuration could not be resolved (offending path: ${packagedConfigPath}). ` +
            `Neither a project-root override at ${projectConfigPath} nor the packaged default exists; ` +
            `a missing packaged config means the shipped ZedUi builder is broken. ` +
            `Restore FrontendBuilder/libs/lint/stylelint.config.mjs in the ZedUi package, or add a project-root .stylelintrc.mp.js.\n`,
    );
    process.exit(1);
}

stylelint
    .lint({
        configFile,
        files: filePaths,
        formatter: 'string',
        fix: isFixMode,
    })
    .then((data) => {
        if (data.errored) {
            process.stdout.write(data.report);
            process.exit(1);
        }
    })
    .catch((error: unknown) => {
        const reason = error instanceof Error ? (error.stack ?? error.message) : String(error);

        console.error(
            `Stylelint failed to run over the Merchant Portal stylesheets (${filePaths.join(', ')}).\n` +
                `Reason: ${reason}\n` +
                `This is a runner failure, not a lint violation. Check that ${configFile} is readable ` +
                `and valid, then re-run "npm run mp:stylelint".\n`,
        );
        process.exit(1);
    });
