import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LayoutCenteredComponent } from './layout-centered.component';
import { LayoutFooterModule } from '../layout-footer/layout-footer.module';

@Component({
    standalone: false,
    template: `
        <mp-layout-centered>
            <span footer></span>
            <span class="default-slot"></span>
        </mp-layout-centered>
    `,
})
class TestHostComponent {}

describe('LayoutCenteredComponent', () => {
    let hostFixture: ComponentFixture<TestHostComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [LayoutFooterModule],
            declarations: [LayoutCenteredComponent, TestHostComponent],
            schemas: [NO_ERRORS_SCHEMA],
        });

        hostFixture = TestBed.createComponent(TestHostComponent);
        hostFixture.detectChanges();
    });

    it('should render <mp-layout-footer> component', () => {
        const layoutFooterComponent = hostFixture.debugElement.query(By.css('mp-layout-footer'));

        expect(layoutFooterComponent).toBeTruthy();
    });

    it('should render `footer` slot to the <mp-layout-footer> component', () => {
        const footerSlot = hostFixture.debugElement.query(By.css('mp-layout-footer [footer]'));

        expect(footerSlot).toBeTruthy();
    });

    it('should render default slot to the `.mp-layout-centered__content` element', () => {
        const defaultSlot = hostFixture.debugElement.query(By.css('.mp-layout-centered__content .default-slot'));

        expect(defaultSlot).toBeTruthy();
    });
});
