import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    Input,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import { UnsavedChangesFormMonitorDirective } from '@spryker/unsaved-changes.monitor.form';
import { jsonAttribute } from '@spryker/utils';

@Component({
    standalone: false,
    selector: 'mp-form',
    templateUrl: './form.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
})
export class FormComponent {
    @ViewChild(UnsavedChangesFormMonitorDirective)
    unsavedChangesFormMonitorDirective?: UnsavedChangesFormMonitorDirective;

    @Input() action?: string;
    @Input() method?: string;
    @Input() name?: string;
    @Input({ transform: jsonAttribute }) attrs: Record<string, string> = {};
    @Input({ transform: booleanAttribute }) withMonitor = false;

    submitHandler() {
        this.unsavedChangesFormMonitorDirective?.reset();
    }
}
