import { Component, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

@Component({
    selector: 'mp-layout-footer',
    templateUrl: './layout-footer.component.html',
    styleUrls: ['./layout-footer.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'mp-layout-footer',
    },
})
export class LayoutFooterComponent {}
