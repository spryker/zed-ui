import { describe, it, expect } from '@jest/globals';
import { resolveBuilderSettings } from '../settings.mts';
import {
    MERCHANT_PORTAL_PROJECT_NAME,
    reconcileAngularConfiguration,
    type AngularAsset,
    type ReconciledAngularConfiguration,
} from '../libs/angular-configuration.mts';
import { fixturePath } from './helpers/fixtures.mts';

const TYPESCRIPT_CONFIGURATION_FILE_NAMES = { build: 'tsconfig.mp.json', spec: 'tsconfig.mp.spec.json' };

const reconcileFixture = (fixtureName: string): Promise<ReconciledAngularConfiguration> =>
    reconcileAngularConfiguration(
        resolveBuilderSettings(fixturePath(fixtureName)),
        TYPESCRIPT_CONFIGURATION_FILE_NAMES,
    );

const buildOptionsOf = async (fixtureName: string): Promise<Record<string, unknown>> => {
    const { configuration } = await reconcileFixture(fixtureName);

    return configuration.projects?.[MERCHANT_PORTAL_PROJECT_NAME]?.architect?.build?.options as Record<string, unknown>;
};

describe('writing angular.json from scratch', () => {
    it('points the webpack configuration and the index transform at the core module', async () => {
        const buildOptions = await buildOptionsOf('configuration-monorepo');

        expect(buildOptions.customWebpackConfig).toEqual({
            path: './src/Spryker/ZedUi/src/Spryker/Zed/ZedUi/FrontendBuilder/webpack.config.mts',
            mergeRules: {},
        });
        expect(buildOptions.indexTransform).toBe(
            './src/Spryker/ZedUi/src/Spryker/Zed/ZedUi/FrontendBuilder/libs/index-transform.mts',
        );
    });

    // angular.json used to repeat these two values, and development-watch.mts throws when the copy
    // drifts from the builder settings. Generating them from the settings removes the second source.
    it('takes the output path and the base href from the builder settings', async () => {
        const settings = resolveBuilderSettings(fixturePath('configuration-monorepo'));
        const buildOptions = await buildOptionsOf('configuration-monorepo');

        expect(buildOptions.outputPath).toBe('public/MerchantPortal/assets/js');
        expect(buildOptions.baseHref).toBe(settings.urls.assetsPublicPath);
    });

    it('resolves every core path into the vendor layout', async () => {
        const { configuration } = await reconcileFixture('configuration-project');
        const project = configuration.projects?.[MERCHANT_PORTAL_PROJECT_NAME];
        const buildOptions = project?.architect?.build?.options as Record<string, unknown>;
        const testOptions = project?.architect?.test?.options as Record<string, unknown>;

        expect(buildOptions.styles).toEqual([
            'vendor/spryker/zed-ui/src/Spryker/Zed/ZedUi/Presentation/Components/styles.less',
            'src/Pyz/ZedUi/src/Pyz/Zed/ZedUi/Presentation/Components/styles.less',
        ]);
        expect((buildOptions.assets as AngularAsset[])[0].input).toBe('vendor/spryker');
        expect(testOptions.config).toBe('vendor/spryker/zed-ui/src/Spryker/Zed/ZedUi/FrontendBuilder/jest.config.mjs');
    });

    it('keeps the jest builder on zone.js change detection', async () => {
        const { configuration } = await reconcileFixture('configuration-monorepo');
        const testOptions = configuration.projects?.[MERCHANT_PORTAL_PROJECT_NAME]?.architect?.test?.options;

        expect(testOptions?.zoneless).toBe(false);
    });
});

describe('reconciling an angular.json a project already has', () => {
    it('repoints the core paths the other source layout had left behind', async () => {
        const buildOptions = await buildOptionsOf('configuration-existing');

        expect((buildOptions.customWebpackConfig as { path: string }).path).toBe(
            './src/Spryker/ZedUi/src/Spryker/Zed/ZedUi/FrontendBuilder/webpack.config.mts',
        );
        expect(buildOptions.styles).toEqual([
            'src/Spryker/ZedUi/src/Spryker/Zed/ZedUi/Presentation/Components/styles.less',
            'src/Pyz/ZedUi/src/Pyz/Zed/ZedUi/Presentation/Components/styles.less',
        ]);
    });

    it('corrects an output path that drifted from the builder settings', async () => {
        const buildOptions = await buildOptionsOf('configuration-existing');

        expect(buildOptions.outputPath).toBe('public/MerchantPortal/assets/js');
    });

    it('replaces the core asset roots and keeps the ones the project added', async () => {
        const buildOptions = await buildOptionsOf('configuration-existing');

        expect(buildOptions.assets).toEqual([
            {
                glob: '*/src/Spryker/Zed/*/Presentation/Components/assets/**/*',
                input: 'src/Spryker',
                output: '/assets/',
            },
            { glob: '*/data/files/**/*', input: 'src/Spryker', output: '/static/' },
            {
                glob: '*/Presentation/Components/assets/**/*',
                input: 'src/Pyz/*/src/Pyz/Zed',
                output: '/assets/',
            },
        ]);
    });

    it('leaves the budgets the project set alone', async () => {
        const { configuration } = await reconcileFixture('configuration-existing');
        const productionConfiguration = configuration.projects?.[MERCHANT_PORTAL_PROJECT_NAME]?.architect?.build
            ?.configurations as { production: { budgets: unknown } };

        expect(productionConfiguration.production.budgets).toEqual([
            { type: 'bundle', maximumWarning: '9mb', maximumError: '9mb' },
        ]);
    });
});

describe('an angular.json whose Merchant Portal project cannot be identified', () => {
    it('names the projects it found and what to do about them', async () => {
        await expect(reconcileFixture('configuration-unknown-project')).rejects.toThrow(
            /angular\.json[\s\S]*back-office, storefront[\s\S]*which one it is[\s\S]*mp:update:config/,
        );
    });
});
