import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import angularEslint from 'angular-eslint';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { sprykerBaseGlobals, sprykerBaseRules } from './spryker-base-eslint.mjs';
import { resolveProjectRoot } from '../../settings.mts';
import {
    BUILD_CONFIGURATION_FILE_NAME,
    LINT_CONFIGURATION_FILE_NAME,
    SPEC_CONFIGURATION_FILE_NAME,
} from '../typescript-configuration.mts';

// Mirrors where the reconciliation writes a configuration: the project root when the project keeps
// a file of that name there, the builder otherwise.
const BUILDER_DIRECTORY = join(import.meta.dirname, '..', '..');
const configurationPath = (fileName) => {
    const projectPath = join(resolveProjectRoot(), fileName);

    return existsSync(projectPath) ? projectPath : join(BUILDER_DIRECTORY, fileName);
};

const merchantPortalProjectConfig = [
    {
        files: ['src/Pyz/*/src/Pyz/Zed/*/Presentation/Components/**/*.ts'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
                project: [configurationPath(BUILD_CONFIGURATION_FILE_NAME)],
            },
        },
        plugins: {
            '@typescript-eslint': typescriptEslint,
            '@angular-eslint': angularEslint.tsPlugin,
        },
        processor: angularEslint.processInlineTemplates,
        rules: {
            ...sprykerBaseRules,
            'no-undef': 'off',
            'no-unused-vars': 'off',
            'no-console': [
                'warn',
                {
                    allow: ['warn', 'error'],
                },
            ],
            'no-empty': 'error',
            'no-use-before-define': 'off',
            'max-classes-per-file': 'off',
            'max-lines': 'off',
            'handle-callback-err': 'off',
            '@typescript-eslint/array-type': 'off',
            '@typescript-eslint/no-restricted-imports': ['error', 'rxjs/Rx'],
            '@typescript-eslint/no-unused-vars': 'error',
            '@typescript-eslint/no-inferrable-types': [
                'error',
                {
                    ignoreParameters: true,
                },
            ],
            '@typescript-eslint/no-non-null-assertion': 'error',
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/member-ordering': [
                'error',
                {
                    default: ['instance-field', 'instance-method', 'static-field', 'static-method'],
                },
            ],
            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: 'mp',
                    style: 'camelCase',
                },
            ],
            '@angular-eslint/component-selector': [
                'error',
                {
                    type: 'element',
                    prefix: 'mp',
                    style: 'kebab-case',
                },
            ],
            '@angular-eslint/no-host-metadata-property': 'off',
        },
    },
    {
        files: ['src/Pyz/*/src/Pyz/Zed/*/Presentation/Components/**/*.html'],
        languageOptions: {
            parser: angularEslint.templateParser,
        },
        plugins: {
            '@angular-eslint': angularEslint.templatePlugin,
        },
        rules: {
            '@typescript-eslint/ban-types': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-empty-interface': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@angular-eslint/no-host-metadata-property': 'off',
            '@angular-eslint/directive-class-suffix': 'off',
            'no-prototype-builtins': 'off',
        },
    },
];

const CORE_TYPESCRIPT_PATTERN = 'src/Spryker/*/src/Spryker/Zed/*/Presentation/Components/**/*.ts';
const CORE_TEMPLATE_PATTERN = 'src/Spryker/*/src/Spryker/Zed/*/Presentation/Components/**/*.html';
const CORE_TYPESCRIPT_PROGRAMS = [
    configurationPath(BUILD_CONFIGURATION_FILE_NAME),
    configurationPath(SPEC_CONFIGURATION_FILE_NAME),
    configurationPath(LINT_CONFIGURATION_FILE_NAME),
];

export const merchantPortalCoreConfig = merchantPortalProjectConfig.map((block) => {
    const isTemplateBlock = block.files.some((pattern) => pattern.endsWith('.html'));
    const coreBlock = { ...block, files: [isTemplateBlock ? CORE_TEMPLATE_PATTERN : CORE_TYPESCRIPT_PATTERN] };

    if (!isTemplateBlock) {
        coreBlock.languageOptions = {
            ...block.languageOptions,
            parserOptions: { ...block.languageOptions.parserOptions, project: CORE_TYPESCRIPT_PROGRAMS },
        };
    }

    return coreBlock;
});

export default [...merchantPortalProjectConfig, ...merchantPortalCoreConfig];
