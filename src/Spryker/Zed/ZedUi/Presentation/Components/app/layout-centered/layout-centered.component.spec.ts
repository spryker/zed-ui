import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';

import { LayoutCenteredComponent } from './layout-centered.component';
import { LayoutFooterModule } from '../layout-footer/layout-footer.module';

describe('LayoutCentralComponent', () => {
    let component: TestComponent;
    let fixture: ComponentFixture<TestComponent>;

    @Component({
        selector: 'test',
        template: `
            <mp-layout-centered>Content</mp-layout-centered>
        `
    })
    class TestComponent {}

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [LayoutFooterModule],
            declarations: [LayoutCenteredComponent, TestComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(TestComponent);
        component = fixture.componentInstance;
    });

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    it('component must render `mp-layout-footer` component', () => {
        const footerElem = fixture.debugElement.query(By.css('mp-layout-footer'));
        expect(footerElem).toBeTruthy();
    });

    it('is ng-content renderer inside `mp-layout-centered` component', () => {
        const footerContentElem = fixture.debugElement.query(By.css('.mp-layout-centered__content'));
        expect(footerContentElem.nativeElement.textContent).toMatch('Content');
    });
});
