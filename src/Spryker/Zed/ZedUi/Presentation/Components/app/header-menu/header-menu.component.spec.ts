import { Component, Input, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HeaderMenuComponent } from './header-menu.component';

@Component({
    standalone: false,
    template: `
        <mp-header-menu [navigationConfig]="navigationConfig">
            <span info-primary></span>
            <span info-secondary></span>
            <div class="default-slot"></div>
        </mp-header-menu>
    `,
})
class TestHostComponent {
    @Input() navigationConfig: unknown;
}

describe('HeaderMenuComponent', () => {
    let hostFixture: ComponentFixture<TestHostComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [HeaderMenuComponent, TestHostComponent],
            schemas: [NO_ERRORS_SCHEMA],
        });

        hostFixture = TestBed.createComponent(TestHostComponent);
        hostFixture.detectChanges();
    });

    it('should render <spy-user-menu> component', () => {
        const userMenuComponent = hostFixture.debugElement.query(By.css('spy-user-menu'));

        expect(userMenuComponent).toBeTruthy();
    });

    it('should render <spy-user-menu-item> component', () => {
        const userMenuItemComponent = hostFixture.debugElement.query(By.css('spy-user-menu-item'));

        expect(userMenuItemComponent).toBeTruthy();
    });

    it('should render `info-primary` slot to the `.mp-header-menu__user-info-primary` element', () => {
        const infoPrimarySlot = hostFixture.debugElement.query(
            By.css('.mp-header-menu__user-info-primary [info-primary]'),
        );

        expect(infoPrimarySlot).toBeTruthy();
    });

    it('should render `info-secondary` slot to the `.mp-header-menu__user-info-secondary` element', () => {
        const infoSecondarySlot = hostFixture.debugElement.query(
            By.css('.mp-header-menu__user-info-secondary [info-secondary]'),
        );

        expect(infoSecondarySlot).toBeTruthy();
    });

    it('should render default slot to the <spy-user-menu> component', () => {
        const defaultSlot = hostFixture.debugElement.query(By.css('spy-user-menu .default-slot'));

        expect(defaultSlot).toBeTruthy();
    });

    it('should render `@Input(navigationConfig)` data to the `.mp-header-menu__link` element', () => {
        const mockConfig = [
            {
                url: 'mockUrl',
                type: 'mockType',
                title: 'mockTitle',
            },
        ];
        const localHostFixture = TestBed.createComponent(TestHostComponent);
        localHostFixture.componentRef.setInput('navigationConfig', mockConfig);
        localHostFixture.detectChanges();

        const linkElem = localHostFixture.debugElement.query(By.css('.mp-header-menu__link'));
        const userMenuLinkComponent = localHostFixture.debugElement.query(
            By.css('.mp-header-menu__link spy-user-menu-link'),
        );

        expect(linkElem).toBeTruthy();
        expect(linkElem.properties.href).toBe(mockConfig[0].url);
        expect(userMenuLinkComponent).toBeTruthy();
        expect(userMenuLinkComponent.properties.type).toBe(mockConfig[0].type);
        expect(userMenuLinkComponent.nativeElement.textContent.trim()).toBe(mockConfig[0].title);
    });
});
