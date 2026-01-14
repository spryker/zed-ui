import { booleanAttribute, ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
    standalone: false,
    selector: 'mp-content-toggle',
    templateUrl: './content-toggle.component.html',
    styleUrls: ['./content-toggle.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'mp-content-toggle' },
})
export class ContentToggleComponent {
    @Input() name = '';
    @Input({ transform: booleanAttribute }) isContentHidden = true;

    handleCheckChange(checked: boolean): void {
        this.isContentHidden = checked;
    }
}
