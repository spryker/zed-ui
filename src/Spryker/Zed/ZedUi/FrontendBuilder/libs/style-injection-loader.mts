import type { LoaderContext } from 'webpack';

/**
 * Pitching loader: the module that imported a stylesheet appends it to the document when it loads. The Merchant
 * Portal layout links only `styles.css`, and Angular attaches the styles of its components the same way at runtime.
 */
export function pitch(this: LoaderContext<Record<string, never>>, remainingRequest: string): string {
    const stylesheetRequest = JSON.stringify(this.utils.contextify(this.context, `!!${remainingRequest}`));

    return [
        `import css from ${stylesheetRequest};`,
        `const style = document.createElement('style');`,
        `style.textContent = css;`,
        `document.head.appendChild(style);`,
    ].join('\n');
}
