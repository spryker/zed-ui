import { Component, ChangeDetectionStrategy, ViewEncapsulation, Input } from '@angular/core';

@Component({
    standalone: false,
    selector: 'mp-merchant-layout-main',
    templateUrl: './merchant-layout-main.component.html',
    styleUrls: ['./merchant-layout-main.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
})
export class MerchantLayoutMainComponent {
    @Input() navigationConfig = '';
}
