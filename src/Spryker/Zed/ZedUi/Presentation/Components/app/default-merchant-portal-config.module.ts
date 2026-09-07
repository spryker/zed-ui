import { OVERLAY_DEFAULT_CONFIG } from '@angular/cdk/overlay';
import { NgModule } from '@angular/core';
import { LocaleModule } from '@spryker/locale';
import { DeLocaleModule } from '@spryker/locale/locales/de';
import { EnLocaleModule, EN_LOCALE } from '@spryker/locale/locales/en';
import { ModalModule } from '@spryker/modal';
import { NotificationModule } from '@spryker/notification';
import { PersistenceModule } from '@spryker/persistence';
import { DefaultContextSerializationModule } from '@spryker/utils';
import { DateFnsDateAdapterModule } from '@spryker/utils.date.adapter.date-fns';
import { WebComponentsModule } from '@spryker/web-components';
import { AjaxActionModule } from '@spryker/ajax-action';
import { DefaultActionsConfigModule } from './actions/default-actions-config.module';
import { DefaultCacheConfigModule } from './cache/default-cache-config.module';
import { DefaultDatasourcesConfigModule } from './datasources/default-datasources-config.module';
import { DefaultDateAdapterConfigModule } from './date-adapter/default-date-adapter-config.module';
import { DefaultUnsavedChangesConfigModule } from './unsaved-changes/default-unsaved-changes-config.module';

@NgModule({
    imports: [
        WebComponentsModule.forRoot(),
        LocaleModule.forRoot({ defaultLocale: EN_LOCALE }),
        EnLocaleModule,
        DeLocaleModule,
        NotificationModule.forRoot(),
        AjaxActionModule,
        DefaultContextSerializationModule,
        DefaultUnsavedChangesConfigModule,
        DefaultActionsConfigModule,
        ModalModule.forRoot(),
        DateFnsDateAdapterModule,
        DefaultDateAdapterConfigModule,
        DefaultDatasourcesConfigModule,
        DefaultCacheConfigModule,
        PersistenceModule,
    ],
    providers: [{ provide: OVERLAY_DEFAULT_CONFIG, useValue: { usePopover: false } }],
})
export class DefaultMerchantPortalConfigModule {}
