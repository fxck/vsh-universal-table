import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { FocusableOption } from '@angular/cdk/a11y';

@Component({
  selector: 'vsh-universal-list-suggest-item',
  templateUrl: './universal-list-suggest-item.component.html',
  styleUrls: [ './universal-list-suggest-item.component.scss' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UniversalListSuggestItemComponent implements FocusableOption {
  @Input()
  isActive: boolean;

  @Input()
  entityId: string;

  getLabel() {
    return '';
    // return this.data.title;
  }

  focus() { }
}
