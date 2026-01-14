import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MerchantLayoutCenteredComponent } from './merchant-layout-centered.component';
import { LayoutCenteredModule } from '../layout-centered/layout-centered.module';

@Component({
    standalone: false,
    template: `
        <mp-merchant-layout-centered>
            <span footer></span>
            <span class="default-slot"></span>
        </mp-merchant-layout-centered>
    `,
})
class TestHostComponent {}

describe('MerchantLayoutCenteredComponent', () => {
    let hostFixture: ComponentFixture<TestHostComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [LayoutCenteredModule],
            declarations: [MerchantLayoutCenteredComponent, TestHostComponent],
            schemas: [NO_ERRORS_SCHEMA],
        });

        hostFixture = TestBed.createComponent(TestHostComponent);
        hostFixture.detectChanges();
    });

    it('should render <mp-layout-centered> component', () => {
        const layoutCenteredComponent = hostFixture.debugElement.query(By.css('mp-layout-centered'));

        expect(layoutCenteredComponent).toBeTruthy();
    });

    it('should render `footer` slot to the `mp-layout-centered__footer` element', () => {
        const footerSlot = hostFixture.debugElement.query(By.css('.mp-layout-centered__footer [footer]'));

        expect(footerSlot).toBeTruthy();
    });

    it('should render default slot to the <mp-layout-centered> component', () => {
        const defaultSlot = hostFixture.debugElement.query(By.css('mp-layout-centered .default-slot'));

        expect(defaultSlot).toBeTruthy();
    });
});
