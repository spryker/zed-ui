import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import angularEslint from 'angular-eslint';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadProjectBuilderSettings, resolveProjectRoot } from '../../settings.mts';
import {
    BUILD_CONFIGURATION_FILE_NAME,
    LINT_CONFIGURATION_FILE_NAME,
    SPEC_CONFIGURATION_FILE_NAME,
} from '../typescript-configuration.mts';
import { joinConfigurationPath } from '../utils.mts';

// The module directories differ per source layout, so the patterns are built from the detected one.
const { layout } = await loadProjectBuilderSettings();
const buildProjectPatterns = (extension) =>
    Object.values(layout.projectModulesDirectories).map((directory) =>
        joinConfigurationPath(directory, `*/Presentation/Components/**/*.${extension}`),
    );
const buildCorePattern = (extension) =>
    joinConfigurationPath(layout.coreModulesDirectory, `*/src/Spryker/Zed/*/Presentation/Components/**/*.${extension}`);

// Mirrors where the reconciliation writes a configuration: the project root when the project keeps
// a file of that name there, the builder otherwise.
const BUILDER_DIRECTORY = join(import.meta.dirname, '..', '..');
const configurationPath = (fileName) => {
    const projectPath = join(resolveProjectRoot(), fileName);

    return existsSync(projectPath) ? projectPath : join(BUILDER_DIRECTORY, fileName);
};

const merchantPortalProjectConfig = [
    {
        files: buildProjectPatterns('ts'),
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
            'accessor-pairs': 'error',
            camelcase: [
                'error',
                {
                    properties: 'always',
                },
            ],
            eqeqeq: [
                'error',
                'always',
                {
                    null: 'ignore',
                },
            ],
            'new-cap': [
                'error',
                {
                    newIsCap: true,
                    capIsNew: false,
                },
            ],
            'no-array-constructor': 'error',
            'no-caller': 'error',
            'no-compare-neg-zero': 'error',
            'no-cond-assign': ['error', 'always'],
            'no-console': [
                'warn',
                {
                    allow: ['warn', 'error'],
                },
            ],
            'no-constant-condition': [
                'error',
                {
                    checkLoops: false,
                },
            ],
            'no-control-regex': 'error',
            'no-debugger': 'error',
            'no-delete-var': 'error',
            'no-dupe-args': 'error',
            'no-dupe-keys': 'error',
            'no-duplicate-case': 'error',
            'no-empty-character-class': 'error',
            'no-empty-pattern': 'error',
            'no-eval': 'error',
            'no-ex-assign': 'error',
            'no-extra-bind': 'error',
            'no-extra-boolean-cast': 'off',
            'no-fallthrough': 'error',
            'no-func-assign': 'error',
            'no-global-assign': 'error',
            'no-implied-eval': 'error',
            'no-inner-declarations': ['error', 'functions'],
            'no-invalid-regexp': 'error',
            'no-irregular-whitespace': [
                'error',
                {
                    skipStrings: true,
                    skipTemplates: true,
                },
            ],
            'no-iterator': 'error',
            'no-label-var': 'error',
            'no-labels': [
                'error',
                {
                    allowLoop: false,
                    allowSwitch: false,
                },
            ],
            'no-lone-blocks': 'error',
            'no-multi-str': 'error',
            'no-negated-in-lhs': 'error',
            'no-new-func': 'error',
            'no-new-object': 'error',
            'no-new-require': 'error',
            'no-new-wrappers': 'error',
            'no-obj-calls': 'error',
            'no-octal': 'error',
            'no-octal-escape': 'error',
            'no-path-concat': 'error',
            'no-proto': 'error',
            'no-prototype-builtins': 'off',
            'no-redeclare': 'error',
            'no-regex-spaces': 'error',
            'no-return-assign': ['error', 'except-parens'],
            'no-return-await': 'error',
            'no-self-assign': 'error',
            'no-self-compare': 'error',
            'no-sequences': 'error',
            'no-shadow-restricted-names': 'error',
            'no-sparse-arrays': 'error',
            'no-template-curly-in-string': 'error',
            'no-throw-literal': 'error',
            'no-undef-init': 'error',
            'no-unexpected-multiline': 'error',
            'no-unmodified-loop-condition': 'error',
            'no-unneeded-ternary': ['error'],
            'no-unreachable': 'error',
            'no-unsafe-finally': 'error',
            'no-unsafe-negation': 'error',
            'no-unused-expressions': [
                'error',
                {
                    allowShortCircuit: true,
                    allowTernary: true,
                    allowTaggedTemplates: true,
                },
            ],
            'no-useless-call': 'error',
            'no-useless-escape': 'error',
            'no-useless-return': 'error',
            'no-with': 'error',
            'one-var': [
                'error',
                {
                    initialized: 'never',
                },
            ],
            'prefer-promise-reject-errors': 'error',
            'spaced-comment': [
                'error',
                'always',
                {
                    line: {
                        markers: ['*package', '!', '/', ',', '='],
                    },
                    block: {
                        balanced: true,
                        markers: ['*package', '!', ',', ':', '::', 'flow-include'],
                        exceptions: ['*'],
                    },
                },
            ],
            'unicode-bom': ['error', 'never'],
            'use-isnan': 'error',
            'valid-typeof': [
                'error',
                {
                    requireStringLiterals: true,
                },
            ],
            'wrap-iife': [
                'error',
                'any',
                {
                    functionPrototypeMethods: true,
                },
            ],
            yoda: ['error', 'never'],
            'no-empty': 'error',
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
        files: buildProjectPatterns('html'),
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

const CORE_TYPESCRIPT_PROGRAMS = [
    configurationPath(BUILD_CONFIGURATION_FILE_NAME),
    configurationPath(SPEC_CONFIGURATION_FILE_NAME),
    configurationPath(LINT_CONFIGURATION_FILE_NAME),
];

export const merchantPortalCoreConfig = merchantPortalProjectConfig.map((block) => {
    const isTemplateBlock = block.files.some((pattern) => pattern.endsWith('.html'));
    const coreBlock = { ...block, files: [buildCorePattern(isTemplateBlock ? 'html' : 'ts')] };

    if (!isTemplateBlock) {
        coreBlock.languageOptions = {
            ...block.languageOptions,
            parserOptions: { ...block.languageOptions.parserOptions, project: CORE_TYPESCRIPT_PROGRAMS },
        };
    }

    return coreBlock;
});

export default [...merchantPortalProjectConfig, ...merchantPortalCoreConfig];
