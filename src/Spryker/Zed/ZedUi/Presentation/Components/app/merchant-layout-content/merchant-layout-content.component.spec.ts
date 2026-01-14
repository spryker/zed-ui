import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MerchantLayoutContentComponent } from './merchant-layout-content.component';

@Component({
    standalone: false,
    template: `
        <web-mp-merchant-layout-content>
            <span title></span>
            <span button-action></span>
            <span main></span>
        </web-mp-merchant-layout-content>
    `,
})
class TestHostComponent {}

describe('MerchantLayoutContentComponent', () => {
    let fixture: ComponentFixture<TestHostComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [MerchantLayoutContentComponent, TestHostComponent],
            schemas: [NO_ERRORS_SCHEMA],
        });

        fixture = TestBed.createComponent(TestHostComponent);
    });

    it('should render main content', () => {
        fixture.detectChanges();
        const content = fixture.debugElement.query(By.css('[main]'));

        expect(content).toBeTruthy();
    });

    it('should render `title` slot', () => {
        fixture.detectChanges();
        const titleSlot = fixture.debugElement.query(By.css('[title]'));

        expect(titleSlot).toBeTruthy();
    });

    it('should render `button-action` slot', () => {
        fixture.detectChanges();
        const buttonActionSlot = fixture.debugElement.query(By.css('[button-action]'));

        expect(buttonActionSlot).toBeTruthy();
    });
});
