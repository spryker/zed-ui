import { NgModule } from '@angular/core';
import { provideIcons } from '@spryker/icon';

const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24px" height="24px" viewBox="0 0 24 24" version="1.1">
        <title>4fcd89fb-efbb-4fb9-ad77-abf8a3183de0@1.00x</title>
        <defs>
            <path d="M2.61494505,9.06286685 L10.4835714,11.8787225 C10.9588312,12.0485662 11.2750175,12.4920274 11.2747284,12.9883404 L11.2747284,20.5546179 C11.2756173,20.9402995 11.0843996,21.3020757 10.7626015,21.5235355 C10.4408034,21.7449954 10.02903,21.7981946 9.65978022,21.666015 L1.79054945,18.8501594 C1.31573613,18.6801928 0.999869331,18.2370781 0.999999959,17.7411346 L0.999999959,10.1718917 C0.999999959,9.78662901 1.19144192,9.42556936 1.51311596,9.20466742 C1.83479,8.98376547 2.2460969,8.93083208 2.61494505,9.06286685 Z M21.3850549,9.06286685 C21.7539031,8.93083208 22.16521,8.98376547 22.486884,9.20466742 C22.8085581,9.42556936 23,9.78662901 23,10.1718917 L23,10.1718917 L23,17.7411346 C23,18.2372302 22.6838977,18.68039 22.2088462,18.8501594 L22.2088462,18.8501594 L14.3402198,21.666015 C13.97097,21.7981946 13.5591966,21.7449954 13.2373985,21.5235355 C12.9156004,21.3020757 12.7243827,20.9402995 12.7252716,20.5546179 L12.7252716,20.5546179 L12.7252716,12.9883404 C12.7251441,12.4923968 13.0410109,12.0492821 13.5158242,11.8793155 L13.5158242,11.8793155 Z M11.1423626,3.15182372 C11.6983882,2.9569743 12.3047618,2.94966982 12.8654945,3.13106657 L12.8654945,3.13106657 L21.7821429,6.07502344 C21.9697154,6.13576314 22.0988112,6.30480349 22.1055578,6.49850872 C22.1123045,6.69221395 21.9952713,6.86950834 21.8123626,6.94267229 L21.8123626,6.94267229 L13.0655495,10.4322457 C12.3805533,10.7054887 11.6155806,10.7143869 10.9241758,10.4571542 L10.9241758,10.4571542 L2.19730769,7.21073605 C2.01252885,7.14205692 1.89100336,6.96759527 1.89287108,6.77371892 C1.89478224,6.57984256 2.01968567,6.40769328 2.20576923,6.34249414 L2.20576923,6.34249414 Z" id="path-1"/>
        </defs>
        <g id="icons" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g id="Icon-/-navigation-/-products">
                <mask id="mask-2" fill="white">
                    <use xlink:href="#path-1"/>
                </mask>
                <use id="Mask" fill="currentColor" xlink:href="#path-1"/>
                <g id="Colours-/-Ink" mask="url(#mask-2)" fill="currentColor">
                    <g transform="translate(0.000000, 1.000000)" id="Colour-/-Ink">
                        <rect x="0" y="0" width="24" height="24"/>
                    </g>
                </g>
            </g>
        </g>
    </svg>
`;

@NgModule({
    providers: [provideIcons([IconOffersModule])],
})
export class IconOffersModule {
    static icon = 'offers';
    static svg = svg;
}
