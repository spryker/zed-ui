import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HeaderComponent } from './header.component';

@Component({
    standalone: false,
    template: `
        <web-mp-header>
            <span menu></span>
        </web-mp-header>
    `,
})
class TestHostComponent {}

describe('HeaderComponent', () => {
    let fixture: ComponentFixture<TestHostComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [HeaderComponent, TestHostComponent],
            schemas: [NO_ERRORS_SCHEMA],
        });

        fixture = TestBed.createComponent(TestHostComponent);
    });

    it('should render `menu` slot to the host element', () => {
        fixture.detectChanges();
        const menuSlot = fixture.debugElement.query(By.css('[menu]'));

        expect(menuSlot).toBeTruthy();
    });
});
