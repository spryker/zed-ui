import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormComponent } from './form.component';

describe('FormComponent', () => {
    let fixture: ComponentFixture<FormComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [FormComponent],
            schemas: [NO_ERRORS_SCHEMA],
        });

        fixture = TestBed.createComponent(FormComponent);
    });

    it('should render <form> component', () => {
        fixture.detectChanges();
        const formComponent = fixture.debugElement.query(By.css('form'));

        expect(formComponent).toBeTruthy();
    });

    it('should bound `@Input(method)` to the `method` input of <form> component', () => {
        const mockMethod = 'post';
        fixture.componentRef.setInput('method', mockMethod);
        fixture.detectChanges();
        const formComponent = fixture.debugElement.query(By.css('form'));

        expect(formComponent.nativeElement.method).toBe(mockMethod);
    });

    it('should bound `@Input(action)` to the `action` input of <form> component', () => {
        const mockAction = 'mockAction';
        fixture.componentRef.setInput('action', mockAction);
        fixture.detectChanges();
        const formComponent = fixture.debugElement.query(By.css('form'));

        expect(formComponent.nativeElement.action).toContain(mockAction);
    });

    it('should bound `@Input(name)` to the `name` input of <form> component', () => {
        const mockName = 'mockName';
        fixture.componentRef.setInput('name', mockName);
        fixture.detectChanges();
        const formComponent = fixture.debugElement.query(By.css('form'));

        expect(formComponent.nativeElement.name).toBe(mockName);
    });

    it('should bound `@Input(attrs)` to the `spyApplyAttrs` input of <form> component', () => {
        const mockAttrs = { mock: 'mockValue' };
        fixture.componentRef.setInput('attrs', mockAttrs);
        fixture.detectChanges();
        const formComponent = fixture.debugElement.query(By.css('form'));

        expect(formComponent.nativeElement.spyApplyAttrs).toEqual(mockAttrs);
    });

    it('should bound `@Input(withMonitor)` to the `spyUnsavedChangesFormMonitor` input of <form> component', () => {
        const mockMonitor = true;
        fixture.componentRef.setInput('withMonitor', mockMonitor);
        fixture.detectChanges();
        const formComponent = fixture.debugElement.query(By.css('form'));

        expect(formComponent.nativeElement.spyUnsavedChangesFormMonitor).toBe(mockMonitor);
    });
});
