import { describe, it, expect } from '@jest/globals';
import { resolveSourceLayout } from '../settings.mts';
import { fixturePath } from './helpers/fixtures.mts';

describe('source layout detection', () => {
    it('detects the monorepo layout from the src/Spryker marker directory', () => {
        expect(resolveSourceLayout(fixturePath('monorepo-layout'))).toMatchObject({
            marker: 'src/Spryker',
            coreModulesDirectory: './src/Spryker',
            projectModulesDirectory: './src/Pyz/*/src/Pyz/Zed',
        });
    });

    it('detects the vendor/project layout from the vendor/spryker marker directory', () => {
        expect(resolveSourceLayout(fixturePath('project-layout'))).toMatchObject({
            marker: 'vendor/spryker',
            coreModulesDirectory: './vendor/spryker',
            projectModulesDirectory: './src/Pyz/Zed',
        });
    });

    it('names the inspected directory, both missing markers and the next action when neither exists', () => {
        const context = fixturePath('undetectable-layout');

        expect(() => resolveSourceLayout(context)).toThrow(context);
        expect(() => resolveSourceLayout(context)).toThrow(/neither "src\/Spryker".*nor "vendor\/spryker"/s);
        expect(() => resolveSourceLayout(context)).toThrow(/must run from the project root/);
    });
});
