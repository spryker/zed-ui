import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { UrlHtmlRendererComponent } from './url-html-renderer.component';

describe('UrlHtmlRendererComponent', () => {
    let fixture: ComponentFixture<UrlHtmlRendererComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [UrlHtmlRendererComponent],
            schemas: [NO_ERRORS_SCHEMA],
        });

        fixture = TestBed.createComponent(UrlHtmlRendererComponent);
    });

    it('should render <spy-html-renderer> component', () => {
        fixture.detectChanges();
        const htmlRendererComponent = fixture.debugElement.query(By.css('spy-html-renderer'));

        expect(htmlRendererComponent).toBeTruthy();
    });

    it('should bound `@Input(url)` to the `urlHtml` input of <spy-html-renderer> component', () => {
        const mockUrl = './mock-url';
        fixture.componentRef.setInput('url', mockUrl);
        fixture.detectChanges();
        const htmlRendererComponent = fixture.debugElement.query(By.css('spy-html-renderer'));

        expect(htmlRendererComponent.nativeElement.urlHtml).toBe(mockUrl);
    });

    it('should bound `@Input(method)` to the `urlMethod` input of <spy-html-renderer> component', () => {
        const mockMethod = 'GET';
        fixture.componentRef.setInput('method', mockMethod);
        fixture.detectChanges();
        const htmlRendererComponent = fixture.debugElement.query(By.css('spy-html-renderer'));

        expect(htmlRendererComponent.nativeElement.urlMethod).toBe(mockMethod);
    });
});
