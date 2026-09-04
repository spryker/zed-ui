# ZedUi Module

[![Latest Stable Version](https://poser.pugx.org/spryker/zed-ui/v/stable.svg)](https://packagist.org/packages/spryker/zed-ui)
[![Minimum PHP Version](https://img.shields.io/badge/php-%3E%3D%208.3-8892BF.svg)](https://php.net/)

This module provides base UI components for Zed application.

## Installation

```
composer require spryker/zed-ui
npm install
npm run build
```

## Merchant Portal frontend builder

Since ZedUi 4.2.0 this module ships the Merchant Portal frontend build tooling at
`src/Spryker/Zed/ZedUi/FrontendBuilder/`. Projects no longer carry their own
`frontend/merchant-portal/` directory, and ZedUi declares the whole `@spryker/*` dependency set for
every Merchant Portal module.

### The generated configuration files

`tsconfig.mp.json`, `tsconfig.mp.spec.json`, `tsconfig.mp.lint.json` and `angular.json` live at your
project root, because the Angular CLI, ESLint and Jest all locate them by walking up from the working
directory. Their contents cannot ship in this module: the paths in them depend on where the core
modules are installed (`src/Spryker/ZedUi` in the Spryker monorepo, `vendor/spryker/zed-ui` in a
project). So the files stay at the root, and this module generates the values that depend on that.

In the three `tsconfig.mp*.json` files:

| Value                                                                               | Owner                                                                |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `compilerOptions.paths` (`@mp/*`)                                                   | generated — added, repointed and removed as core modules come and go |
| `include`, `files`                                                                  | generated — the core and project globs, and the test setup file      |
| everything else (`compilerOptions`, `angularCompilerOptions`, `exclude`, `extends`) | yours                                                                |

In `angular.json`, inside the `merchant-portal` project:

| Value                                                                                                                     | Owner                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `build.options.customWebpackConfig.path`, `build.options.indexTransform`                                                  | generated — the builder entry points                                                                                                 |
| `build.options.outputPath`, `build.options.baseHref`                                                                      | generated from the builder settings, which are the single source for both                                                            |
| `build.options.tsConfig`, `test.options.tsConfig`, `test.options.config`                                                  | generated — the files above, and the packaged jest config                                                                            |
| `build.options.assets` entries rooted at the core directory, and the core entry of `build.options.styles`                 | generated — your own entries are kept                                                                                                |
| `test.options.zoneless`                                                                                                   | generated as `false`; `@angular-builders/jest` 22 defaults it to `true`, which would run your suite without zone.js change detection |
| everything else — `index`, `main`, `polyfills`, `fileReplacements`, `budgets`, optimization flags, your assets and styles | yours                                                                                                                                |

`npm run mp:update:config` performs the reconciliation, and `postinstall` runs it for you. A file
that does not exist yet is written in full; a file that exists keeps every value you set, along with
any `@mp/*` alias, `include` entry, asset root or stylesheet that this module does not generate. A
value it _does_ generate belongs to it, so a hand edit is corrected on the next run.

Because the reconciliation is in place rather than a rewrite, what `ng update` or `ng add` writes
into `angular.json` survives it.

Commit all four files. The builder test suite fails when a committed file no longer matches what the
generator would write, which is what catches a hand edit or a core module added without a
regeneration.

### Migrating a project

1. **Node 24.15.0 or newer.** Angular 22 requires `^22.22.3 || ^24.15.0 || >=26.0.0`. Note that
   Node 25 is _not_ supported by Angular 22 even though it satisfies a `>=24.15.0` range.
2. **Delete `frontend/merchant-portal/`.** Every file in it now lives in this module's
   `FrontendBuilder/`. There is no shim.
3. **Run `npm run mp:update:config`.** It repoints `angular.json` at the vendor path for you — the
   builder entry points, the jest config, `outputPath`/`baseHref`, the core asset roots and core
   stylesheet, and `test.options.zoneless: false`. Keep the file itself at your project root; the
   Angular CLI locates it only by walking up from the working directory. Your `index`, `main`,
   `polyfills`, budgets and optimization settings are left alone. See the section above for the full
   ownership split. Your Merchant Portal project has to be named `merchant-portal`, unless it is the
   only project in the file.
4. **Repoint the `mp:stylelint` and `mp:update:config` scripts** in your project `package.json` at the
   same directory.
5. **Delete the per-module `package.json` files** under your own Merchant Portal modules. ZedUi owns
   the dependency set and npm workspace hoisting resolves it.
6. **TypeScript 6 configuration.** In your project's `tsconfig.base.json`: `moduleResolution:
"bundler"`, remove `baseUrl`, prefix every `paths` value with `./` (including `"*": ["./*"]`), and
   set `"strict": false` explicitly — TypeScript 6 defaults it to `true`. Without the `./` prefixes
   the compiler fails with `TS5090: Non-relative paths are not allowed when 'baseUrl' is not set`.
   The three `tsconfig.mp*.json` files are generated — see below — so you do not edit their `paths`
   by hand.
7. **Register the ng-zorro date adapter in your project's `AppModule`.** ng-zorro 22 no longer ships an
   implicit date adapter, and `NZ_DATE_ADAPTER` has no default — without this every date picker throws
   `NullInjectorError` at runtime:

    ```ts
    import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';

    @NgModule({
        imports: [/* … */],
        providers: [provideNzDateFnsAdapter()],
    })
    export class AppModule extends RootMerchantPortalModule {}
    ```

    This is project-level on purpose. `provideNzDateFnsAdapter` does not exist in ng-zorro 20, so ZedUi
    cannot register it for you without breaking projects that are still on Angular 20 — which is also
    why it is not part of `DefaultMerchantPortalConfigModule`. Note this is a _different_ abstraction
    from `@spryker/utils.date.adapter.date-fns`, which ZedUi already imports: that one implements
    Spryker's own `DateAdapter`, not ng-zorro's `NzDateAdapter`.

8. **Update `spryker/zed-ui` first, or together with** the other Merchant Portal modules. Modules that
   no longer declare npm dependencies require `spryker/zed-ui: ^4.2.0`, because an older ZedUi does
   not declare the consolidated set.

### Staying on Angular 20

`@spryker/*` ranges are declared as `^old || ^new` so Angular-20 projects keep working. npm does not
backtrack on peer conflicts — it selects the highest version satisfying the range and then fails if
the peers do not line up — so an unpinned install on Angular 20 can resolve the new major and abort
with `ERESOLVE`. Pin each `@spryker/*` package to its old major explicitly. A blanket `^3` is
**wrong**: `actions.confirmation`, `datasource.dependable`, `datasource.trigger`,
`datasource.trigger.change`, `datasource.trigger.input` and `table.column.button-action` are on the
`^2.x` line. The full per-package pin list is published in the Spryker documentation.

### Live reload

`npm run mp:build:watch` writes a build manifest alongside the bundles and injects a small polling
client, so an edited `.ts` or `.less` reloads the open Back Office page. Production and plain
development builds contain neither the client nor the manifest. Twig templates are **not** watched:
Zed caches them server-side, so a browser reload alone would not show the change.

## Documentation

[Spryker Documentation](https://docs.spryker.com)
