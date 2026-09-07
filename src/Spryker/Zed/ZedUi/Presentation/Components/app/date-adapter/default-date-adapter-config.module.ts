import { EnvironmentProviders, NgModule } from '@angular/core';
import * as nzTime from 'ng-zorro-antd/core/time';

type NzDateFnsAdapterProviderFactory = () => EnvironmentProviders;

const resolveNzDateFnsAdapterProviders = (): EnvironmentProviders[] => {
    const nzTimeExports = nzTime as unknown as Record<string, unknown>;
    const provideNzDateFnsAdapter = nzTimeExports.provideNzDateFnsAdapter as
        NzDateFnsAdapterProviderFactory | undefined;

    return provideNzDateFnsAdapter === undefined ? [] : [provideNzDateFnsAdapter()];
};

@NgModule({
    providers: [...resolveNzDateFnsAdapterProviders()],
})
export class DefaultDateAdapterConfigModule {}
