import { NgModule } from '@angular/core';
import { provideIcons } from '@spryker/icon';

const svg = `
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" >
    <path d="M12.3407 20.1C12.4041 20.1 12.4674 20.0842 12.5308 20.0525C12.5941 20.0208 12.6416 19.9892 12.6732 19.9575L20.4633 12.1675C20.6533 11.9775 20.7918 11.7638 20.8789 11.5262C20.966 11.2888 21.0095 11.0513 21.0095 10.8138C21.0095 10.5604 20.966 10.319 20.8789 10.0894C20.7918 9.85979 20.6533 9.65792 20.4633 9.48375L16.4257 5.44625C16.2516 5.25625 16.0497 5.11771 15.8201 5.03063C15.5905 4.94354 15.3491 4.9 15.0958 4.9C14.8583 4.9 14.6208 4.94354 14.3833 5.03063C14.1458 5.11771 13.932 5.25625 13.742 5.44625L13.4808 5.7075L15.2382 7.48875C15.4757 7.71042 15.6499 7.96375 15.7608 8.24875C15.8716 8.53375 15.927 8.83458 15.927 9.15125C15.927 9.81625 15.7014 10.3744 15.2501 10.8256C14.7989 11.2769 14.2408 11.5025 13.5758 11.5025C13.2591 11.5025 12.9543 11.4471 12.6614 11.3363C12.3685 11.2254 12.1112 11.0592 11.8895 10.8375L10.1082 9.08L5.952 13.2363C5.9045 13.2838 5.86888 13.3352 5.84512 13.3906C5.82138 13.446 5.8095 13.5054 5.8095 13.5687C5.8095 13.6954 5.857 13.8102 5.952 13.9131C6.047 14.016 6.15783 14.0675 6.2845 14.0675C6.34783 14.0675 6.41117 14.0517 6.4745 14.02C6.53783 13.9883 6.58533 13.9567 6.617 13.925L9.847 10.695L11.177 12.025L7.97075 15.255C7.92325 15.3025 7.88763 15.354 7.86387 15.4094C7.84013 15.4648 7.82825 15.5242 7.82825 15.5875C7.82825 15.7142 7.87575 15.825 7.97075 15.92C8.06575 16.015 8.17658 16.0625 8.30325 16.0625C8.36658 16.0625 8.42992 16.0467 8.49325 16.015C8.55658 15.9833 8.60408 15.9517 8.63575 15.92L11.8658 12.7137L13.1957 14.0437L9.9895 17.2738C9.942 17.3054 9.90637 17.3529 9.88262 17.4163C9.85887 17.4796 9.847 17.5429 9.847 17.6062C9.847 17.7329 9.8945 17.8438 9.9895 17.9388C10.0845 18.0338 10.1953 18.0813 10.322 18.0813C10.3853 18.0813 10.4447 18.0694 10.5001 18.0456C10.5555 18.0219 10.607 17.9862 10.6545 17.9388L13.8845 14.7325L15.2145 16.0625L11.9845 19.2925C11.937 19.34 11.9014 19.3915 11.8776 19.4469C11.8539 19.5023 11.842 19.5617 11.842 19.625C11.842 19.7517 11.8935 19.8625 11.9964 19.9575C12.0993 20.0525 12.2141 20.1 12.3407 20.1ZM12.317 22C11.7312 22 11.2126 21.806 10.7614 21.4181C10.3101 21.0302 10.0449 20.5433 9.96575 19.9575C9.42742 19.8783 8.97617 19.6567 8.612 19.2925C8.24783 18.9283 8.02617 18.4771 7.947 17.9388C7.40867 17.8596 6.96137 17.634 6.60512 17.2619C6.24887 16.8898 6.03117 16.4425 5.952 15.92C5.35033 15.8408 4.8595 15.5796 4.4795 15.1363C4.0995 14.6929 3.9095 14.1704 3.9095 13.5687C3.9095 13.2521 3.96887 12.9473 4.08763 12.6544C4.20637 12.3615 4.37658 12.1042 4.59825 11.8825L10.1082 6.39625L13.2195 9.5075C13.2512 9.555 13.2987 9.59062 13.362 9.61438C13.4253 9.63812 13.4887 9.65 13.552 9.65C13.6945 9.65 13.8132 9.60646 13.9082 9.51938C14.0033 9.43229 14.0507 9.3175 14.0507 9.175C14.0507 9.11167 14.0389 9.04833 14.0151 8.985C13.9914 8.92167 13.9557 8.87417 13.9082 8.8425L10.512 5.44625C10.3378 5.25625 10.136 5.11771 9.90637 5.03063C9.67679 4.94354 9.43533 4.9 9.182 4.9C8.9445 4.9 8.707 4.94354 8.4695 5.03063C8.232 5.11771 8.01825 5.25625 7.82825 5.44625L4.4795 8.81875C4.337 8.96125 4.21825 9.1275 4.12325 9.3175C4.02825 9.5075 3.96492 9.6975 3.93325 9.8875C3.90158 10.0775 3.90158 10.2715 3.93325 10.4694C3.96492 10.6673 4.02825 10.8533 4.12325 11.0275L2.74575 12.405C2.47658 12.0408 2.27867 11.641 2.152 11.2056C2.02533 10.7702 1.97783 10.3308 2.0095 9.8875C2.04117 9.44417 2.152 9.01271 2.342 8.59313C2.532 8.17354 2.79325 7.7975 3.12575 7.465L6.4745 4.11625C6.8545 3.75208 7.27804 3.475 7.74512 3.285C8.21221 3.095 8.69117 3 9.182 3C9.67283 3 10.1518 3.095 10.6189 3.285C11.086 3.475 11.5016 3.75208 11.8658 4.11625L12.127 4.3775L12.3883 4.11625C12.7683 3.75208 13.1918 3.475 13.6589 3.285C14.126 3.095 14.6049 3 15.0958 3C15.5866 3 16.0655 3.095 16.5326 3.285C16.9997 3.475 17.4153 3.75208 17.7795 4.11625L21.7933 8.13C22.1574 8.49417 22.4345 8.91375 22.6245 9.38875C22.8145 9.86375 22.9095 10.3467 22.9095 10.8375C22.9095 11.3283 22.8145 11.8073 22.6245 12.2744C22.4345 12.7415 22.1574 13.1571 21.7933 13.5212L14.0033 21.2875C13.7816 21.5092 13.5243 21.6833 13.2314 21.81C12.9385 21.9367 12.6337 22 12.317 22Z"/>
</svg>
`;

@NgModule({
    providers: [provideIcons([IconContractsModule])],
})
export class IconContractsModule {
    static icon = 'contracts';
    static svg = svg;
}