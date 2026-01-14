import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LayoutFooterComponent } from './layout-footer.component';

@Component({
    standalone: false,
    template: `
        <web-mp-layout-footer>
            <span class="default-slot"></span>
        </web-mp-layout-footer>
    `,
})
class TestHostComponent {}

describe('LayoutFooterComponent', () => {
    let fixture: ComponentFixture<TestHostComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [LayoutFooterComponent, TestHostComponent],
            schemas: [NO_ERRORS_SCHEMA],
        });

        fixture = TestBed.createComponent(TestHostComponent);
    });

    it('should render default slot to the `.mp-layout-footer__content` element', () => {
        fixture.detectChanges();
        const defaultSlot = fixture.debugElement.query(By.css('.default-slot'));

        expect(defaultSlot).toBeTruthy();
    });
});
