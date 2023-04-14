import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  ContentChild,
  TemplateRef,
  EventEmitter,
  Output,
  Directive,
  ContentChildren,
  QueryList,
  ViewChild
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Sort } from '@angular/material/sort';
import { PageEvent } from '@angular/material/paginator';
import { MatMenu } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl } from '@angular/forms';
import { Store, select } from '@ngrx/store';
import { BaseClass } from '@zerops/fe/core';
import { getOneLoading } from '@zerops/fe/loadings';
import {
  Observable,
  merge,
  BehaviorSubject,
  combineLatest,
  Subject,
  of
} from 'rxjs';
import {
  map,
  takeUntil,
  switchMap,
  distinctUntilChanged,
  tap,
  withLatestFrom,
  catchError,
  filter,
  startWith
} from 'rxjs/operators';
import { State, ApiError } from '@app/models';
import {
  PersonalDataGetRequest,
  gerPersonalDataByKey
} from '@app/modules/personal-data';
import { ErrorTranslationService } from '@app/services/error-translation.service';
import { LastRouteService } from '@app/services/last-route.service';
import { ScrollableComponent } from '@app/modules/scrollable';
import {
  getDataForSubscriptionName,
  getColumnsForEntity,
  getParamsForSubscriptionName,
  getFiltersForSubscriptionName,
  getExportFormats
} from '../../universal-list.selector';
import {
  ColumnItem,
  UniversalListQuery,
  ListParams
} from '../../universal-list.model';
import {
  ColumnsRequest,
  SetParamsFilters,
  ListReset,
  ActionTypes,
  RemoveSubscriptionRequest
} from '../../universal-list.action';
import {
  getFavoriteColumns$,
  getUniqKey,
  getNormalizedColumns
} from '../../universal-list-data.utils';
import { UniversableListParser } from '../../universal-list-parser.service';
import { COLUMN_FILTER_NAMESPACE, BaseUrls } from '../../universal-list.constant';
import { UniversalListApi } from '../../universal-list.api';
import {
  UniveralListTableLinkDirective,
  UniveralListTableCellTemplateDirective,
  UniversalListTableComponent
} from '../universal-list-table';

@Directive({
  selector: '[vshUniversalListDataColumnFilter]'
})
export class UniversalListDataColumnFilterDirective { }

@Component({
  selector: 'vsh-universal-list-data',
  templateUrl: './universal-list-data.container.html',
  styleUrls: [ './universal-list-data.container.scss' ]
})
export class UniversalListDataContainer extends BaseClass implements OnInit, OnDestroy {
  // # Event Streams
  onDownload$ = new Subject<void>();
  filter$ = new Subject<any[]>();

  // # Data
  // -- angular
  @Input()
  entity: string;

  @Input()
  baseUrl = BaseUrls.stream;

  @Input()
  subscriptionName: string;

  @Input()
  set filter(v) { this._filter = v; this.filter$.next(v); }
  get filter() { return this._filter; }

  @Input()
  maxHeight: number;

  @Input()
  defaultColumns: { [index: string]: boolean };

  @Input()
  hardColumns: string[];

  @Input()
  showFooter = true;

  @Input()
  set blacklistedColumns(v: string[]) {
    if (v) { this.blacklistedColumns$.next(v); }
  }

  @Input()
  namespace = '';

  @Input()
  set menuRef(v) {
    this._menuRef = v;

    this.hasMenu$.next(!!v);
  }
  get menuRef() { return this._menuRef; }

  @Input()
  customRowClassFnc: () => boolean;

  @Output()
  menuOpened = new EventEmitter<any>(false);

  @ContentChild(UniveralListTableLinkDirective, { read: TemplateRef })
  set linkTemplate(v) {
    this.hasLink$.next(!!v);
    this._linkTemplate = v;
  }
  get linkTemplate() { return this._linkTemplate; }

  @ContentChild(UniversalListDataColumnFilterDirective, { read: TemplateRef })
  columnFilterRef: UniversalListDataColumnFilterDirective;

  @ContentChildren(UniveralListTableCellTemplateDirective)
  set cellTemplates(v) {
    this._cellTemplates = v;

    if (v) {
      v.forEach((cell) => {
        this.cellTemplatesMap[cell.vshUniversalTableCellTemplate] = cell.templateRef;
      });
    } else {
      this.cellTemplatesMap = {};
    }
  }
  get cellTemplates() {
    return this._cellTemplates;
  }

  @ViewChild('tableScrollableRef', { read: ScrollableComponent })
  tableScrollableRef: ScrollableComponent;

  @ViewChild(UniversalListTableComponent)
  tableRef: UniversalListTableComponent;

  // -- sync
  pageSize = 50;
  exportRunning = false;
  cellTemplatesMap: { [id: string]: TemplateRef<any>; } = {};
  formatCtrl = new FormControl();

  // -- async
  data$: Observable<any[]>;
  total$: Observable<number>;
  activeColumns$: Observable<string[]>;
  params$: Observable<Partial<ListParams>>;
  columns$: Observable<ColumnItem[]>;
  favorites$: Observable<string>;
  currentPage$: Observable<number>;
  hasLink$ = new BehaviorSubject(false);
  hasMenu$ = new BehaviorSubject(false);
  blacklistedColumns$ = new BehaviorSubject([]);
  showData$: Observable<boolean>;
  showLoading$: Observable<boolean>;
  showEmptyState$: Observable<boolean>;
  dataLoading$ = this._store.pipe(
    select(getOneLoading(ActionTypes.ListRequest)),
    distinctUntilChanged()
  );
  exportFormats$ = this._store.pipe(
    select(getExportFormats),
    tap((values) => values.includes('xlsx')
      ? this.formatCtrl.setValue('xlsx')
      : this.formatCtrl.setValue(values[0])
    ),
    map((values) => {
      const filteredFormats = values.filter((format) => format !== 'json');

      if (filteredFormats.length <= 1) {
        this.formatCtrl.disable();
      }

      return filteredFormats;
    })
  );

  // # Action Streams
  private _columnsRequestAction$: Observable<ColumnsRequest>;
  private _favoritesRequestAction$: Observable<PersonalDataGetRequest>;
  private _setParamsFiltersAction$: Observable<SetParamsFilters>;

  private _linkTemplate: TemplateRef<any>;
  private _cellTemplates: QueryList<UniveralListTableCellTemplateDirective>;
  private _menuRef: MatMenu;
  private _namespace = COLUMN_FILTER_NAMESPACE;
  private _filter: any;

  constructor(
    private _api: UniversalListApi,
    private _store: Store<State>,
    private _errorTranslate: ErrorTranslationService,
    private _snackBar: MatSnackBar,
    private _router: Router,
    private _activatedRoute: ActivatedRoute,
    private _parser: UniversableListParser,
    private _lastRoute: LastRouteService
  ) {
    super();
  }

  ngOnInit() {
    // fill in all properties that require
    // data from @Inputs
    this.data$ = this._store.pipe(select(
      getDataForSubscriptionName(this.subscriptionName)),
      map((data) => data ? data.items : [])
    );
    this.total$ = this._store.pipe(select(
      getDataForSubscriptionName(this.subscriptionName)),
      map((data) => data ? data.total : 0)
    );
    this.favorites$ = this._store.pipe(select(
      gerPersonalDataByKey(getUniqKey(this.entity, this._namespace + this.namespace))
    ));
    this.params$ = this._store.pipe(
      select(getParamsForSubscriptionName(this.subscriptionName))
    );
    this.currentPage$ = this.params$.pipe(
      map((params) => {
        if (params && params.offset) {
          const offset = parseInt(params.offset, 10);
          return Math.round(offset / this.pageSize);
        }
      })
    );

    const filters$ = this._store.pipe(select(
      getFiltersForSubscriptionName(this.subscriptionName)
    ));

    this._setParamsFiltersAction$ = combineLatest(
      this._activatedRoute.params,
      this.filter$.pipe(startWith(this._filter))
    )
      .pipe(
        withLatestFrom(
          filters$,
          this.params$
        ),
        map(([ [ { q, limit, offset, sort, direction }, hardFilter ], filters, params ]) => {

          let route;
          if (this._lastRoute.previousUrl()) {
            route = this._lastRoute.previousUrl().state.root.firstChild;

            while (route.firstChild) {
              route = route.firstChild;
            }
          }

          let query: UniversalListQuery;

          if (q || q === '') {
            query = this._parser.parse(q);
          } else {
            query = filters;
          }

          return new SetParamsFilters({
            query,
            limit: limit ? limit : params ? params.limit : undefined,
            offset: offset >= 0 ? offset : params ? params.offset : undefined,
            sort: sort ? sort : params ? params.sort : undefined,
            direction: direction ? direction : params ? params.direction : undefined,
            entity: this.entity,
            subscriptionName: this.subscriptionName,
            suggest: query ? query.suggest : undefined,
            filter: hardFilter || []
          },
          {
            route: (route ? route.data.key === this._activatedRoute.snapshot.data.key : true),
            baseUrl: this.baseUrl
          });
        })
      );

    this._columnsRequestAction$ = this._ngOnInit$.pipe(
      map(() => new ColumnsRequest(this.entity, this.baseUrl))
    );
    this._favoritesRequestAction$ = this._ngOnInit$.pipe(
      map(() => new PersonalDataGetRequest(getUniqKey(this.entity, COLUMN_FILTER_NAMESPACE + this.namespace)))
    );

    this.columns$ = this._store.pipe(
      select(getColumnsForEntity(this.entity, this.baseUrl))
    );

    // either set hard inputed columns or search for favorites and defaults
    if (this.hardColumns && this.hardColumns.length > 0) {
      this.activeColumns$ = of(this.hardColumns)
        .pipe(
          switchMap((cols) => combineLatest(
            this.hasLink$.pipe(distinctUntilChanged()),
            this.hasMenu$.pipe(distinctUntilChanged())
          ).pipe(
            map(([ hasLink, hasMenu ]) => {
              const link = hasLink ? ['_link'] : [];
              const menu = hasMenu ? ['_options'] : [];

              return [ ...link, ...cols, ...menu ];
            })
          ))
        );
    } else {
      this.activeColumns$ = combineLatest(
        getFavoriteColumns$(
          this.columns$,
          this.favorites$
        )
        .pipe(
          switchMap(([ columns, favorites ]) => combineLatest(
            this.hasLink$.pipe(distinctUntilChanged()),
            this.hasMenu$.pipe(distinctUntilChanged())
          ).pipe(
            map(([ hasLink, hasMenu ]) => ({ columns, favorites, hasLink, hasMenu }))
          )),
          map(({ columns, favorites, hasLink, hasMenu }) => {
            const r = getNormalizedColumns(
              columns,
              favorites,
              this.defaultColumns
            )
            .filter((col) => col.value)
            .map((col) => col.name);

            const link = hasLink ? ['_link'] : [];
            const menu = hasMenu ? ['_options'] : [];

            // automatically add fixed "link" column if it has
            // a template defined
            return [ ...link, ...r, ...menu ];
          })
        ),
        this.blacklistedColumns$.pipe(
          distinctUntilChanged(),
          map((blCols) => blCols.reduce((obj, key) => {
            obj[key] = true;
            return obj;
          }, {}))
        )
      ).pipe(map(([ columns, blacklist ]) => {
        return columns.filter((col) => blacklist[col] !== true);
      }));
    }

    this.showData$ = combineLatest(
      this.data$,
      this.columns$
    )
      .pipe(
        map(([ data, columns ]) => !columns
          || (columns && (!data || !data.length))
          ? false
          : true
        )
      );

    this.showLoading$ = combineLatest(
      this.data$,
      this.columns$,
      this.dataLoading$
    )
      .pipe(
        map(([ data, columns, loading ]) => !columns
          || (columns && (!data || !data.length) && !!loading)
          ? true
          : false
        )
      );

      this.showEmptyState$ = combineLatest(
        this.showData$,
        this.showLoading$
      )
        .pipe(
          map(([ showData, showLoading ]) => !showData && !showLoading)
        );

    // trigger contract file download
    this.onDownload$
      .pipe(
        // add id to download loading map
        tap(() => this.exportRunning = true),
        withLatestFrom(
          filters$,
          this.params$,
          this.formatCtrl.valueChanges,
          this.activeColumns$
        ),
        switchMap(([ _, filters, params, exportFormat, activeColumns ]) => this._api
          .export$(
            this.entity,
            this.baseUrl,
            exportFormat,
            activeColumns,
            filters
              ? filters.filter.map((item) => ({
                value: item.value,
                operator: item.operator,
                name: item.column
              }))
              : undefined,
            params,
            filters ? filters.suggest : undefined
          )
          .pipe(
            // remove id from download loading map
            tap(() => this.exportRunning = false),
            map((response) => response.value),
            // if api returns error, get translation
            // show it in a snackbar, map the result to nothing
            catchError((err: ApiError) => this._errorTranslate
              .get$(err)
              .pipe(switchMap((message) => this._snackBar
                .open(message, '', { panelClass: 'is-error' })
                .onAction()
                .pipe(map(() => undefined))
              ))
            ),
            // stop the stream if error was shown (mapped to nothing)
            filter((url) => !!url)
          )
        ),
        takeUntil(this._ngOnDestroy$)
      )
      .subscribe((value) => {
        // open download url in a new window
        window.location.replace(`/${this.baseUrl}/${this.entity}/search/download/${value}`);
      });

    // # Store Dispatcher
    merge(
      this._setParamsFiltersAction$,
      this._columnsRequestAction$,
      this._favoritesRequestAction$
    )
      .pipe(takeUntil(this._ngOnDestroy$))
      .subscribe(this._store);

    super.ngOnInit();
  }

  ngOnDestroy() {
    this._store.dispatch(new ListReset(this.subscriptionName));
    this._store.dispatch(new RemoveSubscriptionRequest(
      this.subscriptionName,
      this.entity,
      this.baseUrl
    ));

    super.ngOnDestroy();
  }

  trackBy(index: number) {
    return index;
  }

  sort({ active, direction }: Sort) {
    this._router.navigate(
      [
        './',
        {
          ...this._activatedRoute.snapshot.params,
          sort: active,
          direction,
          offset: 0
        }
      ],
      { relativeTo: this._activatedRoute, queryParamsHandling: 'preserve' }
    );
  }

  page(data: PageEvent) {
    this._router.navigate(
      [
        './',
        {
          ...this._activatedRoute.snapshot.params,
          offset: (data.pageIndex * data.pageSize),
          limit: data.pageSize
        }
      ],
      { relativeTo: this._activatedRoute, queryParamsHandling: 'preserve' }
    );

    this.tableScrollableRef.scrollToTop();
  }
}
