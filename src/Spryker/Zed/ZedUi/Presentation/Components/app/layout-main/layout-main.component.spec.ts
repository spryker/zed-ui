import { Component, Input, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LayoutMainComponent } from './layout-main.component';

@Component({
    standalone: false,
    template: `
        <mp-layout-main [navigationConfig]="navigationConfig">
            <span top-section></span>
            <span header></span>
            <span logo></span>
            <span class="default-slot"></span>
        </mp-layout-main>
    `,
})
class TestHostComponent {
    @Input() navigationConfig: any;
}

describe('LayoutMainComponent', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [LayoutMainComponent, TestHostComponent],
            schemas: [NO_ERRORS_SCHEMA],
        });
    });

    describe('Components detection', () => {
        let hostFixture: ComponentFixture<TestHostComponent>;

        beforeEach(() => {
            hostFixture = TestBed.createComponent(TestHostComponent);
            hostFixture.detectChanges();
        });

        it('should render <spy-sidebar> component', () => {
            const sidebarComponent = hostFixture.debugElement.query(By.css('spy-sidebar'));

            expect(sidebarComponent).toBeTruthy();
        });

        it('should render <spy-header> component', () => {
            const headerComponent = hostFixture.debugElement.query(By.css('spy-header'));

            expect(headerComponent).toBeTruthy();
        });

        it('should render <spy-navigation> component to the <spy-sidebar> component', () => {
            const navigationComponent = hostFixture.debugElement.query(By.css('spy-sidebar spy-navigation'));

            expect(navigationComponent).toBeTruthy();
        });
    });

    describe('`isCollapsed` property', () => {
        it('should bound to the `collapsed` input of <spy-navigation> component', () => {
            const hostFixture = TestBed.createComponent(TestHostComponent);
            const component = hostFixture.debugElement.query(By.directive(LayoutMainComponent)).componentInstance;

            hostFixture.componentRef.setInput('navigationConfig', '');
            component.isCollapsed = true;
            hostFixture.detectChanges();

            const navigationComponent = hostFixture.debugElement.query(By.css('spy-sidebar spy-navigation'));

            expect(navigationComponent.properties.collapsed).toBe(true);
        });

        it('should change if `updateCollapseHandler` method invokes', () => {
            const hostFixture = TestBed.createComponent(TestHostComponent);
            hostFixture.detectChanges();

            const component = hostFixture.debugElement.query(By.directive(LayoutMainComponent)).componentInstance;

            component.updateCollapseHandler(true);
            hostFixture.detectChanges();

            expect(component.isCollapsed).toBe(true);
        });
    });

    describe('Slots', () => {
        let hostFixture: ComponentFixture<TestHostComponent>;

        beforeEach(() => {
            hostFixture = TestBed.createComponent(TestHostComponent);
            hostFixture.detectChanges();
        });

        it('should render `logo` slot to the `.mp-layout-main-cnt__logo` element', () => {
            const logoSlot = hostFixture.debugElement.query(By.css('.mp-layout-main-cnt__logo [logo]'));

            expect(logoSlot).toBeTruthy();
        });

        it('should render `top-section` slot to the `.mp-layout-main-cnt__top-section` element', () => {
            const topSectionSlot = hostFixture.debugElement.query(
                By.css('.mp-layout-main-cnt__top-section [top-section]'),
            );

            expect(topSectionSlot).toBeTruthy();
        });

        it('should render `header` slot to the `.mp-layout-main-cnt__header` element', () => {
            const headerSlot = hostFixture.debugElement.query(By.css('.mp-layout-main-cnt__header [header]'));

            expect(headerSlot).toBeTruthy();
        });

        it('should render default slot to the `.mp-layout-main-cnt__content` element', () => {
            const defaultSlot = hostFixture.debugElement.query(By.css('.mp-layout-main-cnt__content .default-slot'));

            expect(defaultSlot).toBeTruthy();
        });
    });

    describe('@Input(navigationConfig)', () => {
        it('should bound to the `items` input of <spy-navigation> component', () => {
            const demoData =
                '[{"title":"Dashboard","url":"\\/dashboard","icon":"fa fa-area-chart","isActive":false,"subItems":[]}]';
            const hostFixture = TestBed.createComponent(TestHostComponent);
            hostFixture.componentRef.setInput('navigationConfig', demoData);
            hostFixture.detectChanges();

            const navigationComponent = hostFixture.debugElement.query(By.css('spy-sidebar spy-navigation'));

            expect(navigationComponent.properties.items).toBe(demoData);
        });

        it('should update binding when changed', () => {
            const demoData =
                '[{"title":"Dashboard","url":"\\/dashboard","icon":"fa fa-area-chart","isActive":false,"subItems":[]}]';
            const hostFixture = TestBed.createComponent(TestHostComponent);
            hostFixture.componentRef.setInput('navigationConfig', demoData);
            hostFixture.detectChanges();

            const navigationComponent = hostFixture.debugElement.query(By.css('spy-sidebar spy-navigation'));

            expect(navigationComponent.properties.items).toBe(demoData);

            hostFixture.componentRef.setInput('navigationConfig', '');
            hostFixture.detectChanges();

            expect(navigationComponent.properties.items).toBe('');
        });
    });
});
