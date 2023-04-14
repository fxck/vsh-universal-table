import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import uuidv4 from 'uuid/v4';
import { Store, select } from '@ngrx/store';
import { BaseClass } from '@zerops/fe/core';
import { Observable, merge, Subject, combineLatest } from 'rxjs';
import {
  takeUntil,
  map,
  withLatestFrom,
  filter as rxFilter,
  distinctUntilChanged
} from 'rxjs/operators';
import { State } from '@app/models';
import {
  PersonalDataGetRequest,
  gerPersonalDataByKey,
  PersonalDataUpsertRequest
} from '@app/modules/personal-data';
import {
  getUniqKey,
  serializeFilterAndParams,
  filtersParamsEmpty
} from '../../universal-list-data.utils';
import {
  getFiltersForSubscriptionName,
  getParamsForSubscriptionName,
  getSessionFiltersForSubscriptionName,
  getSessionParamsForSubscriptionName,
  getColumnsForEntity
} from '../../universal-list.selector';
import { ColumnItem } from '../../universal-list.model';
import { BaseUrls } from '../../universal-list.constant';

@Component({
  selector: 'vsh-universal-list-bookmarks',
  templateUrl: './universal-list-bookmarks.container.html',
  styleUrls: [ './universal-list-bookmarks.container.scss' ]
})
export class UniversalListBookmarksContainer extends BaseClass implements OnInit {
  // # Forms
  form = new FormControl();

  // # Event Streams
  onAdd$ = new Subject<string>();
  onSetDefault$ = new Subject<{
    id: string;
    isDefault: boolean;
  }>();
  onRemove$ = new Subject<number>();

  // # Data
  // -- angular
  @Input()
  entity: string;

  @Input()
  baseUrl = BaseUrls.stream;

  @Input()
  subscriptionName: string;

  @Input()
  route: string;

  @Input()
  namespace = '';

  @Output()
  clicked = new EventEmitter<void>();

  // -- async
  bookmarkLinks$: Observable<any[]>;
  columns$: Observable<ColumnItem[]>;

  // # Action Streams
  private _dataRequestAction$: Observable<PersonalDataGetRequest>;
  private _addAction$: Observable<PersonalDataUpsertRequest>;
  private _setDefaultAction$: Observable<PersonalDataUpsertRequest>;
  private _removeAction$: Observable<PersonalDataUpsertRequest>;

  private _namespace = 'bookmarks';

  constructor(
    private _store: Store<State>,
    private _router: Router
  ) {
    super();
  }

  ngOnInit() {
    // fill in all properties that require
    // data from @Inputs
    this._dataRequestAction$ = this._ngOnInit$.pipe(
      map(() => new PersonalDataGetRequest(getUniqKey(this.entity, this._namespace + this.namespace)))
    );

    this.columns$ = this._store.pipe(select(getColumnsForEntity(this.entity, this.baseUrl)));

    const bookmarks$ = combineLatest(
      this._store.pipe(
        select(gerPersonalDataByKey(getUniqKey(this.entity, this._namespace + this.namespace))),
        map((bookmarks) => bookmarks
          ? JSON.parse(bookmarks)
          : []
        )
      ),
      this.columns$.pipe(
        rxFilter((d) => !!d),
        map((cols) => {
          return cols.reduce((obj, itm) => {
            obj[itm.name] = itm.operators.reduce((oobj, oitm) => {
              oobj[oitm] = true;
              return oobj;
            }, {});
            return obj;
          }, {});
        })
      )
    ).pipe(
      map(([ bookmarks, colMap ]) => {
        const r = bookmarks.map((bm: any) => {
          return {
            ...bm,
            filters: {
              ...bm.filters,
              filter: bm.filters && bm.filters.filter && bm.filters.filter.length
                ? bm.filters.filter.filter((f: any) => f && f.column && colMap[f.column]
                    ? colMap[f.column][f.operator]
                    : false
                  )
                : []
            }
          };
        });

        return r.filter((itm: any) => !!itm.filters.filter.length || (!itm.filters.filter.length && !!itm.filters.suggest));
      }),
      distinctUntilChanged()
    );

    this.bookmarkLinks$ = bookmarks$.pipe(
      map((data) => data.map((({ name, id, params, filters, isDefault }) => {

        const fp = serializeFilterAndParams(filters, params);

        return {
          name,
          id,
          isDefault,
          route: [
            this.route,
            fp
          ]
        };

      })))
    );

    this._addAction$ = this.onAdd$.pipe(
      rxFilter((value) => !!value),
      withLatestFrom(
        this._store.pipe(select(getFiltersForSubscriptionName(this.subscriptionName || this.entity))),
        this._store.pipe(select(getParamsForSubscriptionName(this.subscriptionName || this.entity))),
        bookmarks$
      ),
      map(([ name, filters, params, bookmarks ]) => {
        const r = [
          ...bookmarks,
          {
            id: uuidv4(),
            name,
            filters,
            params
          }
        ];

        return new PersonalDataUpsertRequest(
          JSON.stringify(r),
          getUniqKey(this.entity, this._namespace + this.namespace)
        );
      })
    );

    this._setDefaultAction$ = this.onSetDefault$.pipe(
      withLatestFrom(bookmarks$),
      map(([ { id, isDefault }, bookmarks ]) => {
        const r = bookmarks.map((item) => {
          return {
            ...item,
            isDefault: isDefault ? false : item.id === id
          };
        });

        return new PersonalDataUpsertRequest(
          JSON.stringify(r),
          getUniqKey(this.entity, this._namespace + this.namespace)
        );

      })
    );

    this._removeAction$ = this.onRemove$.pipe(
      withLatestFrom(bookmarks$),
      map(([ id, bookmarks ]) => {
        const r = bookmarks.filter((item) => item.id !== id);

        return new PersonalDataUpsertRequest(
          JSON.stringify(r),
          getUniqKey(this.entity, this._namespace + this.namespace)
        );

      })
    );

      this.bookmarkLinks$.pipe(
        map((l) => l.filter((i) => i.isDefault)),
        rxFilter((l) => !!l.length),
        withLatestFrom(
          this._store.pipe(
            select(
              getFiltersForSubscriptionName(this.subscriptionName || this.entity),
            )
          ),
          this._store.pipe(
            select(
              getParamsForSubscriptionName(this.subscriptionName || this.entity),
            )
          ),
          this._store.pipe(
            select(
              getSessionFiltersForSubscriptionName(this.subscriptionName || this.entity),
            )
          ),
          this._store.pipe(
            select(
              getSessionParamsForSubscriptionName(this.subscriptionName || this.entity),
            )
          )
        ),
        map(([ l, filters, params, sessionFilters, sessionParams ]) => ({ d: l[0], filters, params, sessionFilters, sessionParams }))
      )
      .pipe(
        rxFilter(({ filters, params, sessionFilters, sessionParams }) => {
          return filtersParamsEmpty(filters, params) && filtersParamsEmpty(sessionFilters, sessionParams);
        }),
        map(({ d }) => d.route),
        distinctUntilChanged()
      )
      .subscribe((commands: any[]) => this._router.navigate(commands, { queryParamsHandling: 'preserve' }));

    // # Store Dispatcher
    merge(
      this._dataRequestAction$,
      this._addAction$,
      this._setDefaultAction$,
      this._removeAction$
    )
      .pipe(takeUntil(this._ngOnDestroy$))
      .subscribe(this._store);

    super.ngOnInit();
  }

  trackBy(index: number) {
    return index;
  }

}
