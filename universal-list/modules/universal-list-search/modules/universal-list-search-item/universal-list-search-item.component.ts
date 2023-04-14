import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { FormGroup } from '@angular/forms';

import { SuggestItemBase } from '@app/modules/suggest';
import {
  ColumnItem,
  SuggestRequestPayload
} from '../../../../universal-list.model';
import { ColumnTypes } from '../../../../universal-list.constant';

@Component({
  selector: 'vsh-universal-list-search-item',
  templateUrl: './universal-list-search-item.component.html',
  styleUrls: [ './universal-list-search-item.component.scss' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UniversalListSearchItemComponent {
  @Input()
  data: ColumnItem;

  @Input()
  forceShow: boolean;

  @Input()
  forceHide: boolean;

  @Input()
  form: FormGroup[];

  @Input()
  index: number;

  @Input()
  suggested: SuggestItemBase[];

  @Input()
  activeFiltersMap: { [key: string]: boolean; };

  @Output()
  suggest = new EventEmitter<SuggestRequestPayload>();

  @Output()
  suggestChosen = new EventEmitter<string>();

  @Output()
  addAndControl = new EventEmitter<void>();

  @Output()
  removeAndControl = new EventEmitter<number>();

  columnTypes = ColumnTypes;
  operatorMap = {
    'lt': '<',
    'lte': '<=',
    'eq': '=',
    'ne': '!=',
    'gte': '>=',
    'gt': '>',
    'search': '?'
  };

  trackBy(index: number) {
    return index;
  }
}
