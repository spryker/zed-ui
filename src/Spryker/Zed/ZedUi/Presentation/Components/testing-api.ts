import { ComponentFixture, TestBed, TestModuleMetadata } from '@angular/core/testing';
import { Type } from '@angular/core';

export type ComponentInputs<T> = Partial<T>;

export interface TestingModuleMetadata {
    ngModule?: TestModuleMetadata;
    projectContent?: string;
}

export interface TestingForComponentResult<T> {
    testModule: TestModuleMetadata;
    createComponent: (inputs?: ComponentInputs<T>, detectChanges?: boolean) => ComponentFixture<T>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const createComponentWrapper = <T extends (...args: any) => any>(
    createComponent: T,
    inputs?: ComponentInputs<any>,
    detectChanges = true,
): ReturnType<T> => createComponent(inputs, detectChanges);

export function getTestingForComponent<T>(
    component: Type<T>,
    config: TestingModuleMetadata = {},
): TestingForComponentResult<T> {
    const testModule = {
        declarations: [component, ...(config.ngModule?.declarations || [])],
        imports: config.ngModule?.imports || [],
        providers: config.ngModule?.providers || [],
        schemas: config.ngModule?.schemas || [],
    };

    const createComponent = (inputs?: ComponentInputs<T>, detectChanges = true): ComponentFixture<T> => {
        const fixture = TestBed.createComponent(component);

        if (inputs) {
            Object.assign(fixture.componentInstance, inputs);
        }

        if (config.projectContent) {
            const compiled = fixture.nativeElement as HTMLElement;
            const contentSlot = compiled.querySelector('[ng-content]') || compiled;
            contentSlot.innerHTML = config.projectContent;
        }

        if (detectChanges) {
            fixture.detectChanges();
        }

        return fixture;
    };

    return { testModule, createComponent };
}
/* eslint-enable */
