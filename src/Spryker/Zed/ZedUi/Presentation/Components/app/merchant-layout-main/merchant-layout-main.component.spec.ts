import { Component, Input, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MerchantLayoutMainComponent } from './merchant-layout-main.component';

@Component({
    standalone: false,
    template: `
        <mp-merchant-layout-main [navigationConfig]="navigationConfig">
            <span header></span>
            <span logo></span>
            <span class="default-slot"></span>
        </mp-merchant-layout-main>
    `,
})
class TestHostComponent {
    @Input() navigationConfig: any;
}

describe('MerchantLayoutMainComponent', () => {
    let hostFixture: ComponentFixture<TestHostComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [MerchantLayoutMainComponent, TestHostComponent],
            schemas: [NO_ERRORS_SCHEMA],
        });

        hostFixture = TestBed.createComponent(TestHostComponent);
        hostFixture.detectChanges();
    });

    it('should render <mp-layout-main> component', () => {
        const layoutMainComponent = hostFixture.debugElement.query(By.css('mp-layout-main'));

        expect(layoutMainComponent).toBeTruthy();
    });

    it('should render `header` slot to the <mp-layout-main> component', () => {
        const headerSlot = hostFixture.debugElement.query(By.css('mp-layout-main [header]'));

        expect(headerSlot).toBeTruthy();
    });

    it('should render `logo` slot to the <mp-layout-main> component', () => {
        const logoSlot = hostFixture.debugElement.query(By.css('mp-layout-main [logo]'));

        expect(logoSlot).toBeTruthy();
    });

    it('should render default slot to the <mp-layout-main> component', () => {
        const defaultSlot = hostFixture.debugElement.query(By.css('mp-layout-main .default-slot'));

        expect(defaultSlot).toBeTruthy();
    });

    it('should bound `@Input(navigationConfig)` to the `navigationConfig` input of <mp-layout-main> component', () => {
        const mockConfig =
            '[{"title":"Dashboard","url":"\\/dashboard","icon":"fa fa-area-chart","isActive":false,"subItems":[]}]';
        const localHostFixture = TestBed.createComponent(TestHostComponent);
        localHostFixture.componentRef.setInput('navigationConfig', mockConfig);
        localHostFixture.detectChanges();

        const layoutMainComponent = localHostFixture.debugElement.query(By.css('mp-layout-main'));

        expect(layoutMainComponent.properties.navigationConfig).toBe(mockConfig);
    });
});
