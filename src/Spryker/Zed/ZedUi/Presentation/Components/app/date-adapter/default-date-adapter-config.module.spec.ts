import { TestBed } from '@angular/core/testing';
import { NzDateAdapter } from 'ng-zorro-antd/core/time';
import { DefaultDateAdapterConfigModule } from './default-date-adapter-config.module';

describe('DefaultDateAdapterConfigModule', () => {
    afterEach(() => {
        jest.dontMock('ng-zorro-antd/core/time');
        jest.resetModules();
    });

    it('provides the date adapter ng-zorro 22 no longer registers implicitly', () => {
        TestBed.configureTestingModule({ imports: [DefaultDateAdapterConfigModule] });

        expect(TestBed.inject(NzDateAdapter, null)).not.toBeNull();
    });

    it('provides nothing when the installed ng-zorro exports no date adapter factory, as version 20 does not', async () => {
        jest.resetModules();
        jest.doMock('ng-zorro-antd/core/time', () => ({}));

        const { DefaultDateAdapterConfigModule: moduleWithoutAdapterFactory } =
            await import('./default-date-adapter-config.module');

        TestBed.configureTestingModule({ imports: [moduleWithoutAdapterFactory] });

        expect(TestBed.inject(NzDateAdapter, null)).toBeNull();
    });
});
