import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Configuration, RuleSetRule } from 'webpack';
import type { SharedThemePathAliases } from './shared-theme-aliases.mts';

const ALIAS_WILDCARD_SUFFIX = /\/\*$/;
const STYLE_INJECTION_LOADER_PATH = fileURLToPath(new URL('./style-injection-loader.mts', import.meta.url));
const resolveFromBuilder = createRequire(import.meta.url).resolve;

/** Webpack aliases for the `@shared` tsconfig paths: Sass resolves its `@use` through webpack, not through tsconfig. */
export const buildSharedThemeWebpackAliases = (
    context: string,
    sharedThemeAliases: SharedThemePathAliases,
): Record<string, string[]> =>
    Object.fromEntries(
        Object.entries(sharedThemeAliases).map(([aliasName, aliasTargets]) => [
            aliasName.replace(ALIAS_WILDCARD_SUFFIX, ''),
            aliasTargets.map((aliasTarget) => join(context, aliasTarget.replace(ALIAS_WILDCARD_SUFFIX, ''))),
        ]),
    );

// Angular compiles a stylesheet only as a component resource (`?ngResource`) or a global style
// (`?ngGlobalStyle`); its own `.scss` rule still adds the Sass loaders after these, so this rule goes first.
export const buildImportedStylesheetRule = (): RuleSetRule => ({
    test: /\.scss$/i,
    issuer: /\.ts$/i,
    resourceQuery: { not: [/ngGlobalStyle/, /ngResource/] },
    use: [
        { loader: STYLE_INJECTION_LOADER_PATH },
        { loader: resolveFromBuilder('css-loader'), options: { url: false, exportType: 'string' } },
    ],
});

/** A Shared theme imports its own stylesheet from TypeScript, as the Yves and Back Office builds allow. */
export const applySharedThemeSupport = (
    config: Configuration,
    context: string,
    sharedThemeAliases: SharedThemePathAliases,
): void => {
    config.resolve = {
        ...config.resolve,
        alias: {
            ...(config.resolve?.alias as Record<string, string | string[]>),
            ...buildSharedThemeWebpackAliases(context, sharedThemeAliases),
        },
    };
    config.module = {
        ...config.module,
        rules: [buildImportedStylesheetRule(), ...(config.module?.rules ?? [])],
    };
};
