import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';
import { UserMenuLinkType } from '@spryker/user-menu';
import { jsonAttribute } from '@spryker/utils';

export interface NavigationConfig {
    url: string;
    type: string;
    title: string;
}

@Component({
    standalone: false,
    selector: 'mp-header-menu',
    templateUrl: './header-menu.component.html',
    styleUrls: ['./header-menu.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'mp-header-menu' },
})
export class HeaderMenuComponent {
    @Input({ transform: jsonAttribute }) navigationConfig?: NavigationConfig[];

    linkType: UserMenuLinkType = UserMenuLinkType.Default;
}
