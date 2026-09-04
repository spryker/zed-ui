import type { TargetOptions } from '@angular-builders/custom-webpack';
import { resolveBuilderSettings } from '../settings.mts';
import { discoverEntryPoints } from './entry-points.mts';

const BODY_CLOSING_TAG = '</body>';

const createScriptTag = (source: string): string => `<script src="${source}"></script>`;

const insertTextAt = (text: string, index: number, fullText: string): string =>
    `${fullText.slice(0, index)}${text}${fullText.slice(index)}`;

export default async (targetOptions: TargetOptions, indexHtml: string): Promise<string> => {
    const { entryPointsMap } = await discoverEntryPoints(resolveBuilderSettings());

    return Object.keys(entryPointsMap).reduce((html, entryPointName) => {
        const scriptTag = createScriptTag(`${entryPointName}.js`);

        return insertTextAt(scriptTag, html.indexOf(BODY_CLOSING_TAG), html);
    }, indexHtml);
};
