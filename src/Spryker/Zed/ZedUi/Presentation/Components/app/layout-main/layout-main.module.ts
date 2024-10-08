import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { HeaderModule } from '@spryker/header';
import { LayoutModule } from '@spryker/layout';
import { NavigationModule } from '@spryker/navigation';
import { SidebarModule } from '@spryker/sidebar';
import { ApplyContextsModule } from '@spryker/utils';
import { CustomElementBoundaryModule } from '@spryker/web-components';

import {
    IconContractsModule,
    IconDashboardModule,
    IconOffersModule,
    IconOrdersModule,
    IconProductsModule,
    IconProfileModule,
    IconUserGroupModule,
    IconVariantsModule,
} from '../../icons';
import { LayoutMainComponent } from './layout-main.component';

@NgModule({
    imports: [
        CommonModule,
        LayoutModule,
        HeaderModule,
        SidebarModule,
        NavigationModule,
        ApplyContextsModule,
        CustomElementBoundaryModule,
        IconDashboardModule,
        IconProfileModule,
        IconOrdersModule,
        IconOffersModule,
        IconContractsModule,
        IconUserGroupModule,
        IconProductsModule,
        IconVariantsModule,
    ],
    declarations: [LayoutMainComponent],
    exports: [LayoutMainComponent],
})
export class LayoutMainModule {}
