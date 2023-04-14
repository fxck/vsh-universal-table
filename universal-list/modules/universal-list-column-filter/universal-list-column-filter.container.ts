import { Component, OnInit, Input } from '@angular/core';
import { FormControl, FormArray, FormGroup } from '@angular/forms';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Store, select } from '@ngrx/store';
import { BaseClass } from '@zerops/fe/core';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, map, distinctUntilChanged } from 'rxjs/operators';
import groupBy from 'lodash-es/groupBy';
import sortBy from 'lodash-es/sortBy';
import deburr from 'lodash-es/deburr';
import { gerPersonalDataByKey } from '@app/modules/personal-data';
import { PersonalDataUpsertRequest } from '@app/modules/personal-data';
import { State } from '@app/models';
import { arrayMove } from 'utils';
import { ColumnItem } from '../../universal-list.model';
import { getColumnsForEntity } from '../../universal-list.selector';
import { getFavoriteColumns$, getUniqKey, getNormalizedColumns } from '../../universal-list-data.utils';
import { COLUMN_FILTER_NAMESPACE, BaseUrls } from '../../universal-list.constant';

@Component({
  selector: 'vsh-universal-list-column-filter',
  templateUrl: './universal-list-column-filter.container.html',
  styleUrls: [ './universal-list-column-filter.container.scss' ]
})
export class UniversalListColumnFilterContainer extends BaseClass implements OnInit {
  // # Forms
  form = {
    active: new FormArray([]),
    inactive: new FormArray([]),
  };
  searchForm = new FormControl();

  // # Event Streams
  onSubmit$ = new Subject<any[]>();

  // # Data
  // -- angular
  @Input()
  entity: string;

  @Input()
  baseUrl = BaseUrls.stream;

  @Input()
  namespace = '';

  @Input()
  defaultColumns: { [index: string]: boolean };

  @Input()
  set blacklistedColumns(v: string[]) {
    if (v) { this.blacklistedColumns$.next(v); }
  }

  // -- async
  columns$: Observable<ColumnItem[]>;
  favorites$: Observable<string>;
  blacklistedColumns$ = new BehaviorSubject([]);

  // # Action Stream
  private _submitAction$: Observable<PersonalDataUpsertRequest>;

  private _namespace = COLUMN_FILTER_NAMESPACE;

  constructor(private _store: Store<State>) {
    super();
  }

  ngOnInit() {
    this.columns$ = this._store.pipe(select(getColumnsForEntity(this.entity, this.baseUrl)));
    this.favorites$ = this._store.pipe(select(
      gerPersonalDataByKey(getUniqKey(this.entity, this._namespace + this.namespace))
    ));

    this._submitAction$ = this.onSubmit$.pipe(
      map((val) => new PersonalDataUpsertRequest(
        JSON.stringify(val
          ? val
          : [
            ...this.form.active.value,
            ...this.form.inactive.value
          ]
        ),
        getUniqKey(this.entity, this._namespace + this.namespace)
      ))
    );

    combineLatest(
      getFavoriteColumns$(
        this.columns$,
        this.favorites$
      ).pipe(map(([ columns, favorites ]) => getNormalizedColumns(
        columns,
        favorites,
        this.defaultColumns
      ))),
      this.blacklistedColumns$.pipe(
        distinctUntilChanged(),
        map((blCols) => blCols.reduce((obj, key) => {
          obj[key] = true;
          return obj;
        }, {}))
      )
    )
    .pipe(
      takeUntil(this._ngOnDestroy$),
      map(([ columns, blacklist ]) => columns.filter((col) => blacklist[col.name] !== true))
    )
    .subscribe((cols) => {
      // remove all controls
      while (this.form.active.controls.length) {
        this.form.active.removeAt(0);
      }

      while (this.form.inactive.controls.length) {
        this.form.inactive.removeAt(0);
      }

      const { active, inactive } = groupBy(cols, (col) => {
        return col.value ? 'active' : 'inactive';
      });

      // add new controls
      if (active && active.length) {
        active.forEach((col) => {
          this.form.active.push(new FormGroup({
            name: new FormControl(col.name),
            alias: new FormControl(col.alias),
            value: new FormControl(col.value)
          }));
        });
      }

      if (inactive && inactive.length) {
        sortBy(inactive, [ (s) => deburr(s.alias.toLowerCase()) ]).forEach((col) => {
          this.form.inactive.push(new FormGroup({
            name: new FormControl(col.name),
            alias: new FormControl(col.alias),
            value: new FormControl(col.value)
          }));
        });
      }

    });

    // # Store Dispatcher
    this._submitAction$
      .pipe(takeUntil(this._ngOnDestroy$))
      .subscribe(this._store);
  }

  drop(e: CdkDragDrop<any[]>) {

    const newArr = [
      ...arrayMove(
        [ ...this.form.active.value ],
        e.previousIndex,
        e.currentIndex
      ),
      ...this.form.inactive.value
    ];

    this.onSubmit$.next(newArr);

  }

  trackBy(_: number, item: FormGroup) {
    return item.value.name;
  }

}
