import { NgModule } from '@angular/core';
import { provideIcons } from '@spryker/icon';

const svg = `
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20px" height="20px" viewBox="0 0 20 20" version="1.1">
    <!-- Generator: sketchtool 63.1 (101010) - https://sketch.com -->
    <title>EFF27F7E-0EA2-4313-9919-91BCB138CCC7@2.00x</title>
    <desc>Created with sketchtool.</desc>
    <g id="styleguide" stroke="none" stroke-width="1" fill-rule="evenodd">
        <g id="Icons" transform="translate(-87.000000, -924.000000)">
            <path d="M94.2727273,924 C95.2768814,924 96.0909091,924.814028 96.0909091,925.818182 L96.0909091,942.181818 C96.0909091,943.185972 95.2768814,944 94.2727273,944 L88.8181818,944 C87.8140277,944 87,943.185972 87,942.181818 L87,925.818182 C87,924.814028 87.8140277,924 88.8181818,924 L94.2727273,924 Z M105.181818,934 C106.185972,934 107,934.814028 107,935.818182 L107,942.181818 C107,943.185972 106.185972,944 105.181818,944 L99.7272727,944 C98.7231186,944 97.9090909,943.185972 97.9090909,942.181818 L97.9090909,935.818182 C97.9090909,934.814028 98.7231186,934 99.7272727,934 L105.181818,934 Z M105.181818,924 C106.185972,924 107,924.814028 107,925.818182 L107,930.363636 C107,931.36779 106.185972,932.181818 105.181818,932.181818 L99.7272727,932.181818 C98.7231186,932.181818 97.9090909,931.36779 97.9090909,930.363636 L97.9090909,925.818182 C97.9090909,924.814028 98.7231186,924 99.7272727,924 L105.181818,924 Z" id="Dashboard"/>
        </g>
    </g>
</svg>
`;

@NgModule({
    providers: [provideIcons([IconDashboardModule])],
})
export class IconDashboardModule {
    static icon = 'dashboard';
    static svg = svg;
}
