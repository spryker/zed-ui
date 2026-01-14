import { Component, Input, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ContentToggleComponent } from './content-toggle.component';

@Component({
    standalone: false,
    template: `
        <mp-content-toggle [name]="name" [isContentHidden]="isContentHidden">
            <span toggle-text></span>
            <div class="default-slot"></div>
        </mp-content-toggle>
    `,
})
class TestHostComponent {
    @Input() name: any;
    @Input() isContentHidden: any;
}

describe('ContentToggleComponent', () => {
    let hostFixture: ComponentFixture<TestHostComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [ContentToggleComponent, TestHostComponent],
            schemas: [NO_ERRORS_SCHEMA],
        });

        hostFixture = TestBed.createComponent(TestHostComponent);
        hostFixture.detectChanges();
    });

    it('should render <spy-checkbox> component', () => {
        const checkboxComponent = hostFixture.debugElement.query(By.css('spy-checkbox'));

        expect(checkboxComponent).toBeTruthy();
    });

    it('should render `toggle-text` slot to the <spy-checkbox> component', () => {
        const toggleTextSlot = hostFixture.debugElement.query(By.css('spy-checkbox [toggle-text]'));

        expect(toggleTextSlot).toBeTruthy();
    });

    it('should render default slot to the `.mp-content-toggle__content` element', () => {
        const defaultSlot = hostFixture.debugElement.query(By.css('.mp-content-toggle__content .default-slot'));

        expect(defaultSlot).toBeTruthy();
    });

    it('should bound `@Input(name)` to the `name` input of <spy-checkbox> component', () => {
        const mockName = 'mockName';
        const localHostFixture = TestBed.createComponent(TestHostComponent);
        localHostFixture.componentRef.setInput('name', mockName);
        localHostFixture.detectChanges();

        const checkboxComponent = localHostFixture.debugElement.query(By.css('spy-checkbox'));

        expect(checkboxComponent.properties.name).toBe(mockName);
    });

    it('should bound `@Input(isContentHidden)` to the `checked` input of <spy-checkbox> component', () => {
        const localHostFixture = TestBed.createComponent(TestHostComponent);
        localHostFixture.componentRef.setInput('isContentHidden', true);
        localHostFixture.detectChanges();

        const checkboxComponent = localHostFixture.debugElement.query(By.css('spy-checkbox'));

        expect(checkboxComponent.properties.checked).toBe(true);
    });

    it('should bound `@Input(isContentHidden)` to the `hidden` input of `.mp-content-toggle__content` element', () => {
        const localHostFixture = TestBed.createComponent(TestHostComponent);
        localHostFixture.componentRef.setInput('isContentHidden', true);
        localHostFixture.detectChanges();

        const contentElem = localHostFixture.debugElement.query(By.css('.mp-content-toggle__content'));

        expect(contentElem.properties.hidden).toBe(true);
    });

    it('should change `hidden` property of `.mp-content-toggle__content` element by <spy-checkbox> component change', () => {
        const localHostFixture = TestBed.createComponent(TestHostComponent);
        localHostFixture.componentRef.setInput('isContentHidden', false);
        localHostFixture.detectChanges();

        const contentElem = localHostFixture.debugElement.query(By.css('.mp-content-toggle__content'));
        const checkboxComponent = localHostFixture.debugElement.query(By.css('spy-checkbox'));

        expect(contentElem.properties.hidden).toBe(false);

        checkboxComponent.triggerEventHandler('checkedChange', true);
        localHostFixture.detectChanges();

        expect(contentElem.properties.hidden).toBe(true);
    });
});
