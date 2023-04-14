import {
  Component,
  Directive,
  Input,
  TemplateRef,
  Output,
  EventEmitter,
  Pipe,
  PipeTransform,
  ViewChild
} from '@angular/core';
import { Sort } from '@angular/material/sort';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ColumnItem, ListParams } from '../../universal-list.model';
import { ColumnTypes } from '../../universal-list.constant';

@Pipe({
  name: 'enumTranslate',
  pure: true
})
export class EnumTranslatePipe implements PipeTransform {
  transform(value: any, column: ColumnItem) {
    if (value === undefined || value === null) { return value; }

    const enumItem = column.typeData.values.find((itm) => itm.value === value);

    return enumItem && enumItem.translates
      ? enumItem.translates.cs
      : value;
  }
}

@Directive({
  selector: '[vshUniversalTableCellTemplate]'
})
export class UniveralListTableCellTemplateDirective {
  @Input()
  vshUniversalTableCellTemplate: string;

  constructor(public templateRef: TemplateRef<any>) { }
}

@Directive({
  selector: '[vshUniversalTableLink]'
})
export class UniveralListTableLinkDirective { }

@Component({
  selector: 'vsh-universal-list-table',
  templateUrl: './universal-list-table.component.html',
  styleUrls: [ './universal-list-table.component.scss' ]
})
export class UniversalListTableComponent {
  currentPage: number;

  @Input()
  data: any[];

  @Input()
  isLoading: boolean;

  @Input()
  columns: ColumnItem[];

  @Input()
  set activeColumns(v) {
    this._activeColumns = v;

    if (v) {
      this.hasLink = v.includes('_link');
      this.hasOptions = v.includes('_options');
    }
  }
  get activeColumns() { return this._activeColumns; }

  @Input()
  set disableHoverStyles(v) { this._disableHoverStyles = coerceBooleanProperty(v); }
  get disableHoverStyles() { return this._disableHoverStyles; }

  @Input()
  linkTemplate: TemplateRef<any>;

  @Input()
  cellTemplates: { [id: string]: TemplateRef<any>; };

  @Input()
  customRowClassFnc: () => boolean;

  @Input()
  activeParams: Partial<ListParams>;

  @Input()
  menuRef: MatMenu;

  @Output()
  sort = new EventEmitter<Sort>(false);

  @Output()
  optionOpen = new EventEmitter<any>(false);

  @ViewChild(MatMenuTrigger)
  matMenuTriggerRef: MatMenuTrigger;

  columnTypes = ColumnTypes;

  hasLink: boolean;
  hasOptions: boolean;

  private _activeColumns: string[];
  private _disableHoverStyles: boolean;

  trackBy(index: number) {
    return index;
  }
}
