import {
  Component,
  OnInit,
  Input,
  OnDestroy,
  ContentChild,
  TemplateRef,
  Directive,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
  AfterViewInit,
  EventEmitter,
  Output
} from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  DOWN_ARROW,
  UP_ARROW,
  ENTER,
  RIGHT_ARROW,
  LEFT_ARROW,
  ALT,
  SHIFT
} from '@angular/cdk/keycodes';
import {
  FocusableOption,
  ListKeyManager,
  FocusKeyManager
} from '@angular/cdk/a11y';
import isDate from 'lodash-es/isDate';
import { format } from 'date-fns/esm';
import { Store, select } from '@ngrx/store';
import { BaseClass } from '@zerops/fe/core';
import { SatPopover } from '@zerops/fe/popover';
import { getDimensionsSlice } from '@zerops/fe/dimensions';
import { NgxHotkeysService } from '@balticcode/ngx-hotkeys';
import {
  map,
  takeUntil,
  filter,
  startWith,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap,
  catchError,
  delayWhen,
  take
} from 'rxjs/operators';
import {
  merge,
  Observable,
  Subject,
  combineLatest,
  of,
  BehaviorSubject,
  timer
} from 'rxjs';
import { State } from '@app/models';
import { multiSort } from 'utils';
import { SuggestRequest } from '@app/modules/suggest';
import { gerPersonalDataByKey } from '@app/modules/personal-data';
import {
  getColumnsForEntity,
  getFiltersForSubscriptionName
} from '../../universal-list.selector';
import {
  ColumnItem,
  UniversalListParams,
  UniversalListFilterPayload,
  UniversalListQuery,
  FavCol,
  SuggestRequestPayload
} from '../../universal-list.model';
import {
  ColumnTypes,
  COLUMN_FILTER_NAMESPACE,
  BaseUrls
} from '../../universal-list.constant';
import {
  universableTableSerializer,
  UniversableListParser
} from '../../universal-list-parser.service';
import { getUniqKey, getFavoriteColumns$ } from '../../universal-list-data.utils';
import { UniversalListApi } from '../../universal-list.api';
import { getSuggestUniqKey } from './universal-list-search.utils';
import { UniversalListSuggestItemComponent } from './modules/universal-list-suggest-item';

interface ActiveFilterMap {
  [key: string]: boolean;
}

@Directive({
  selector: '[vshUniversalListSearchBookmark]'
})
export class UniversalListSearchBookmarksDirective { }

@Directive({
  selector: '[vshUniversalListSearchSuggestLink]'
})
export class UniversalListSearchSuggestLinkDirective { }

@Component({
  selector: 'vsh-universal-list-search',
  templateUrl: './universal-list-search.container.html',
  styleUrls: [ './universal-list-search.container.scss' ]
})
export class UniversalListSearchContainer
  extends BaseClass
  implements OnInit, OnDestroy, AfterViewInit {
  // # Forms
  filterForm = new FormArray([]);
  colSearchForm = new FormControl('');
  searchForm = new FormControl('', { updateOn: 'blur' });
  allFiltersForm = new FormControl(false);

  // # Event Streams
  onSuggest$ = new Subject<SuggestRequestPayload>();
  onSuggestChosen$ = new Subject<number>();
  onSearchSuggest$ = new Subject<string>();

  // # Data
  // -- angular
  @Input()
  entity: string;

  @Input()
  baseUrl = BaseUrls.stream;

  @Input()
  subscriptionName: string;

  @Input()
  maxHeight: any;

  @Input()
  namespace = '';

  @Input()
  set blacklistedColumns(v: string[]) {
    if (v) { this.blacklistedColumns$.next(v); }
  }

  @Output()
  suggestedActivated = new EventEmitter<string>();

  @ViewChild('searchInputRef')
  searchInputRef: ElementRef;

  @ViewChild('colSearchInputRef')
  colSearchInputRef: ElementRef;

  @ContentChild(UniversalListSearchSuggestLinkDirective, { read: TemplateRef })
  suggestLinkTemplate: TemplateRef<any>;

  @ContentChild(UniversalListSearchBookmarksDirective, { read: TemplateRef })
  bookmarksRef: UniversalListSearchBookmarksDirective;

  @ViewChild('filtersPopRef')
  filtersPopRef: SatPopover;

  @ViewChild('suggestPopRef')
  suggestPopRef: SatPopover;

  @ViewChild('bookmarksPopRef')
  bookmarksPopRef: SatPopover;

  @ViewChildren(UniversalListSuggestItemComponent)
  suggestItems: QueryList<FocusableOption & UniversalListSuggestItemComponent>;

  // -- sync
  keyManager: ListKeyManager<UniversalListSuggestItemComponent>;
  focused: boolean;
  activeIndex: number;
  columnTypes = ColumnTypes;
  searchOperator = 'search';
  defaultFormEmitEvent = 'blur';
  formEmitEventMap = {
    [this.columnTypes.Boolean]: 'change',
    [this.columnTypes.Datetime]: 'change'
  };
  activeFiltersMap: ActiveFilterMap;
  popOffset = 80;
  suggestRunning = false;

  // -- async
  filterRenderer$: Observable<boolean>;
  filters$: Observable<UniversalListQuery>;
  columns$: Observable<ColumnItem[]>;
  favorites$: Observable<string>;
  activeFiltersMap$: Observable<ActiveFilterMap>;
  favoriteColumns$: Observable<ColumnItem[]>;
  searchSuggestData$: Observable<any[]>;
  blacklistedColumns$ = new BehaviorSubject([]);
  searchWidth$ = this._store.pipe(
    select(getDimensionsSlice),
    map((sizes) => {
      return sizes.universalListSearchField
        ? sizes.universalListSearchField.width
        : 500;
    })
  );

  // # Action Stream
  private _suggestAction$ = this.onSuggest$.pipe(
    debounceTime(200),
    map((payload) => new SuggestRequest(
      this.entity,
      this._getSuggestUniqKey(payload.entity, payload.name),
      this.baseUrl,
      payload.value || '',
      undefined,
      false,
      payload.column
    ))
  );

  private _namespace = COLUMN_FILTER_NAMESPACE;

  constructor(
    private _store: Store<State>,
    private _router: Router,
    private _activatedRoute: ActivatedRoute,
    private _parser: UniversableListParser,
    private _hotkeysService: NgxHotkeysService,
    private _api: UniversalListApi
  ) {
    super();
  }

  ngOnInit() {

    this.onSuggestChosen$.pipe(
      takeUntil(this._ngOnDestroy$)
    ).subscribe((index) => {
      const values = this.filterForm.at(index).get('items') as FormArray;
      values.at(0).get('operator').patchValue('eq');
    });

    // -- hotkeys
    // open
    this._hotkeysService.register({
      combo: 'alt+f',
      allowIn: [ 'INPUT', 'SELECT', 'TEXTAREA' ],
      handler: () => {
        this.searchInputRef.nativeElement.focus();
        this.bookmarksPopRef.close();
        this.filtersPopRef.close();
        this._hotkeysService.pause(this._hotkeysService.get('alt+f'));

        return false;
      }
    });

    // bookmarks
    this._hotkeysService.register({
      combo: 'alt+b',
      allowIn: [ 'INPUT', 'SELECT', 'TEXTAREA' ],
      handler: () => {

        this.bookmarksPopRef.open();
        this.filtersPopRef.close();

        this._hotkeysService.pause(this._hotkeysService.get('alt+b'));

        return false;
      }
    });

    // bookmarks
    this._hotkeysService.register({
      combo: 'alt+v',
      allowIn: [ 'INPUT', 'SELECT', 'TEXTAREA' ],
      handler: () => {

        this.filtersPopRef.open();
        this.bookmarksPopRef.close();

        this._hotkeysService.pause(this._hotkeysService.get('alt+v'));

        return false;
      }
    });

    this._activatedRoute.params.pipe(
      distinctUntilChanged((a, b) => a.q === b.q),
      takeUntil(this._ngOnDestroy$)
    )
      .subscribe(() => {
        if (this.bookmarksPopRef && this.bookmarksPopRef.isOpen()) {
          this.bookmarksPopRef.close();
        }
      });

    // -- async data
    this.filters$ = this._store.pipe(select(getFiltersForSubscriptionName(this.subscriptionName)));
    this.favorites$ = this._store.pipe(
      select(gerPersonalDataByKey(getUniqKey(this.entity, this._namespace + this.namespace)))
    );
    this.columns$ = this._store.pipe(
      select(getColumnsForEntity(this.entity, this.baseUrl))
    );

    // order columns by favorites columns
    this.favoriteColumns$ = combineLatest(
      getFavoriteColumns$(
        this.columns$,
        this.favorites$
      ).pipe(map(([ columns, favorites ]) => multiSort(
        columns,
        favorites,
        'name'
      ))),
      this.blacklistedColumns$.pipe(
        distinctUntilChanged(),
        map((blCols) => blCols.reduce((obj, key) => {
          obj[key] = true;
          return obj;
        }, {}))
      )
    ).pipe(map(([ columns, blacklist ]) => {
      return columns.filter((col) => blacklist[col.name] !== true);
    }));

    // get favorites or default columns, convert them to a map of key:vals
    this.activeFiltersMap$ = combineLatest(
      this.favorites$.pipe(map((val) => val
        ? JSON.parse(val) as FavCol[]
        : undefined
      )),
      this.columns$.pipe(map((data) => data
        ? data.map(({ name, defaultView }) => ({ name, value: defaultView }))
        : []
      )
    ))
    .pipe(
      map(([ favorites, columns ]) => favorites ? favorites : columns),
      map((data) => data
        .filter((item) => item.value)
        .reduce((obj, item) => {
          obj[item.name] = item.value;
          return obj;
        }, {})
      )
    );

    // focus column search form on filter pop over
    this.filtersPopRef
      .opened
      .pipe(takeUntil(this._ngOnDestroy$))
      .subscribe((v) => {
      if (this.colSearchInputRef) {
        setTimeout(() => {
          this.colSearchInputRef.nativeElement.focus();
        }, 100);
      }
    });

    this.bookmarksPopRef
      .afterClose
      .pipe(takeUntil(this._ngOnDestroy$))
      .subscribe(() => {
        this.unpauseBookmarks();
      });

    this.filtersPopRef
      .afterClose
      .pipe(takeUntil(this._ngOnDestroy$))
      .subscribe(() => {
        this.unpauseFilters();
        this.colSearchForm.setValue('', { emitEvent: false });
      });

    // data for search for suggest, uses onSearchSuggest
    // instead of searchForm.valueChanges because we need
    // data immediately and searchForm is set up to propagate
    // values on blur
    this.searchSuggestData$ = this.onSearchSuggest$
      .pipe(
        filter((val) => val.length > 0),
        debounceTime(200),
        tap(() => this.suggestRunning = true),
        switchMap((val) => {
          const data = this._parser.parse(val);

          if (!data) { return of(undefined); }

          return this._api.list$(
            this.entity,
            this.baseUrl,
            undefined,
            data.filter.map(({ column, value, operator }) => ({
              value, operator, name: column
            })),
            {
              limit: '5'
            },
            data.suggest
          ).pipe(catchError(() => of(undefined)));
        }),
        tap(() => this.suggestRunning = false),
        filter((data) => !!data),
        map((data) => data.items),
        tap(() => {
          this.keyManager.updateActiveItem(undefined);
          this.activeIndex = undefined;
        })
      );

    // once you get the (immutable) columns
    // clear any existing root form controls
    // and then re-add them, this is needed
    // because root form array needs to be
    // recalculated upon favorites sort
    this.favoriteColumns$
      .pipe(
        filter((data) => !!data),
        takeUntil(this._ngOnDestroy$)
      )
      .subscribe((columns) => {
        while (this.filterForm.controls.length > 0) {
          this.filterForm.removeAt(0);
        }

        columns.forEach((item) => {
          this._addFormControl(item.name);
        });
      });

    // get query based on the lastest search form value
    const searchQuery$ = this.searchForm
      .valueChanges
      .pipe(
        startWith(null),
        map((v) => {
          // if value is empty string, it means user manually
          // deleted input value, so we want to return that instead
          // of returning undefined for later use
          if (v === '') { return ''; }
          return v ? this._parser.parse(v) : undefined;
        })
      );

    // take only suggest from search form query and combine it
    // with latestValue from state, in case search form query value
    // was not yet emitted
    const searchSuggest$ = combineLatest(
      searchQuery$.pipe(map((f) => f && f !== ''
        // we know it can only be `UniversalListQuery` in this case
        // but TS doesn't
        ? (f as UniversalListQuery).suggest
        : ''
      )),
      this.filters$.pipe(map((f) => f ? f.suggest : undefined))
    ).pipe(
      map(([ formValue, stateValue ]) => {
        if (stateValue && !formValue) {
          return stateValue;
        }

        return formValue;
      }),
      distinctUntilChanged()
    );

    /*
    // workaround needed for re/setting columns and value
    // since we need the actual searchForm value but we want to
    // to clear it upon navigation as well, otherwise it would
    // use the last cached value instead of the state value
    this._router
      .events
      .pipe(
        filter(e => e instanceof NavigationStart),
        takeUntil(this._ngOnDestroy$)
      )
      .subscribe((v) => {
      });
      */

    // get columns and filters and fill in both forms
    combineLatest(
      this.favoriteColumns$,
      this.filters$,
      /* searchQuery$ */
    )
      .pipe(
        // do not follow thru unless columns are set
        filter(([ columns ]) => !!columns),
        takeUntil(this._ngOnDestroy$)
      )
      .subscribe(([ columns, stateQuery, /* searchQuery */ ]) => {

        // create a hash map of column => index in array
        const clMap = this._getColumnHashMap(columns);

        // clean up / remove `items` control of each column control
        // and add empty default one
        columns.forEach((col, i) => {
          const itemsCtrlArr = this.filterForm
            .at(i)
            .get('items') as FormArray;

          while (itemsCtrlArr.controls.length > 0) {
            itemsCtrlArr.removeAt(0);
          }

          this.addAndControl(
            i,
            col.defaultOperator,
            this.formEmitEventMap[col.type] || this.defaultFormEmitEvent
          );
        });

        /*
        // the only way search query can be empty string is if
        // user intentially remove the value from the search form
        // itself, in which case we don't want to re-add filters
        if (searchQuery === '') { return; }
        */

        // get either state filters or search filters, depending on priority
        // (search before state)
        const filters = this._getPrioritizedFilters(stateQuery, undefined /* searchQuery */);

        if (!filters) { return; }

        // for each filter value create new item in `items` control
        filters.forEach(({ column, operator, value }) => {

          // if users' trying to set value of a non existing column
          // TODO: should be converted to suggest in this case
          if (!clMap[column]) { return; }

          // find index and type of the filter item in columns controls
          // using the generated hashmap
          const { index, type } = clMap[column];

          // get form control at the same index
          const form = this.filterForm.at(index) as FormGroup;
          const itemsCtrlArr = form.get('items') as FormArray;
          const itemCtrl = itemsCtrlArr.controls as FormGroup[];

          const currentCtrl = () => itemCtrl[itemCtrl.length - 1];

          // if this control is already filled in
          if (currentCtrl().get('value').value) {
            // add a new `item` to `items` control at the column index
            this.addAndControl(
              index,
              undefined,
              this.formEmitEventMap[type] || this.defaultFormEmitEvent
            );
          }

          // set value from the current filter value
          // at the last index
          currentCtrl().setValue(
            { value: clMap[column] && clMap[column].type === ColumnTypes.Datetime ? new Date(value) : value, operator },
            { emitEvent: false }
          );

        });

        // set search form value based on new filter values
        this.searchForm.setValue(
          universableTableSerializer({
            filter: this._getFormattedFilterPayload(this.filterForm.value),
            suggest: this._getPrioritizedSuggest(stateQuery, undefined/* searchQuery */)
          }),
          { emitEvent: false }
        );

      });

    // set search form value after filters form value changes
    this.filterForm
      .valueChanges
      .pipe(
        switchMap((v) => searchSuggest$.pipe(
          take(1),
          map((suggest) => ({ v, suggest }))
        )),
        takeUntil(this._ngOnDestroy$)
      )
      .subscribe(({ v, suggest }) => {
        const formattedFilter = this._getFormattedFilterPayload(v);
        const serialized = universableTableSerializer({
          filter: formattedFilter,
          suggest
        });

        this.searchForm.setValue(
          serialized || '',
          { emitEvent: false }
        );

      });

    // # Data Resolvers
    this.activeFiltersMap$
      .pipe(takeUntil(this._ngOnDestroy$))
      .subscribe((favorites) => this.activeFiltersMap = favorites);

    // # Store Dispatcher
    merge(
      this._suggestAction$
    )
      .pipe(takeUntil(this._ngOnDestroy$))
      .subscribe(this._store);

    super.ngOnInit();
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }

  ngAfterViewInit() {

    this.filterRenderer$ = merge(
      this.filtersPopRef.afterOpen,
      this.filtersPopRef.afterClose
    )
      .pipe(
        map(() => this.filtersPopRef.isOpen()),
        delayWhen((s) => s ? timer(50) : timer(50)),
      );

    this.keyManager = new FocusKeyManager(this.suggestItems).withWrap();

    this.keyManager
      .change
      .pipe(takeUntil(this._ngOnDestroy$))
      .subscribe((index) => {
        this.activeIndex = index;
      });

  }

  trackBy(index: number) {
    return index;
  }

  onKeyUp(event: KeyboardEvent) {
    if (this.suggestLinkTemplate) {
      event.stopImmediatePropagation();

      if (this.keyManager) {
        const { keyCode } = event;
        const len = this.suggestItems.length;
        const activeIndex = this.keyManager.activeItemIndex;

        // we are on the last item and going down
        // or we are on the first item and going up
        // reset selected item
        if (keyCode === DOWN_ARROW && activeIndex ===  (len - 1)
          || keyCode === UP_ARROW && activeIndex === 0) {
          this.keyManager.updateActiveItem(undefined);
          this.activeIndex = undefined;
          return false;
        }

        if (keyCode === DOWN_ARROW || keyCode === UP_ARROW) {
          this.keyManager.onKeydown(event);
          return false;
        }

        if (keyCode === ENTER) {
          if (this.activeIndex !== undefined) {
            this.suggestedActivated.emit(this.keyManager.activeItem.entityId);

            this.suggestPopRef.close();
          } else {
            this.suggestPopRef.close();
            this.navigate(false, false);
          }
          return false;
        }

        if (keyCode !== LEFT_ARROW
            && keyCode !== RIGHT_ARROW
            && keyCode !== ALT
            && keyCode !== SHIFT) {

          this.onSearchSuggest$.next(this.searchInputRef.nativeElement.value);
        }

      }
    } else if (event.keyCode === ENTER) {
      this.navigate(false, false);
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (this.suggestLinkTemplate) {
      if (event.keyCode === DOWN_ARROW || event.keyCode === UP_ARROW) {
        event.preventDefault();
      }
    }
  }

  onBlur() {
    if (this.suggestLinkTemplate) {
      this.focused = false;
      this.keyManager.updateActiveItem(undefined);
    }
  }

  onFocus() {
    if (!this.focused && this.suggestLinkTemplate) {
      this.focused = true;

      if (this.keyManager) {
        this.keyManager.setFirstItemActive();
      }
    }
  }

  unpauseSearch() {
    this._hotkeysService.unpause(this._hotkeysService.get('alt+f'));
  }

  unpauseBookmarks() {
    this._hotkeysService.unpause(this._hotkeysService.get('alt+b'));
  }

  unpauseFilters() {
    this._hotkeysService.unpause(this._hotkeysService.get('alt+v'));
  }

  addAndControl(
    index: number,
    defaultOperator?: string,
    updateOn = 'blur'
  ) {
    const parent = this.filterForm.at(index);
    // get current operator value from the first control
    const values = parent.get('items') as FormArray;
    const operator = values.at(0)
      ? values.at(0).get('operator').value
      : defaultOperator;

    values.push(this._getBaseFormControlGroup(
      operator,
      updateOn
    ));
  }

  removeAndControl(parentIndex: number, index: number) {
    const ctrl = this.filterForm
      .at(parentIndex)
      .get('items') as FormArray;

    ctrl.removeAt(index);
  }

  navigate(reset = false, refocus = false) {
    if (!reset) {
      // trigger blur and submit to propagate the value
      (document.activeElement as any).blur();
      if (refocus) {
        this.searchInputRef.nativeElement.focus();
      }
    }

    if (this.filtersPopRef.isOpen()) {
      this.filtersPopRef.close();
    }

    setTimeout(() => {
      this._router.navigate(
        [{
          ...this._activatedRoute.snapshot.params,
          offset: 0,
          q: reset ? '' : this.searchForm.value,
        }],
        {
          relativeTo: this._activatedRoute
        }
      );
    }, 10);

  }

  preventFocusRestore(popover: SatPopover) {
    popover['_previouslyFocusedElement'] = null;
  }

  private _addFormControl(key: string) {
    this.filterForm.push(
      new FormGroup({
        key: new FormControl(key),
        items: new FormArray([])
      })
    );
  }

  private _getBaseFormControlGroup(
    defaultOperator?: string,
    updateOn: any = 'blur'
  ) {
    return new FormGroup({
      operator: new FormControl(defaultOperator, { updateOn }),
      value: new FormControl(undefined, { updateOn })
    });
  }

  private _getColumnHashMap(columns: ColumnItem[]) {
    return columns.reduce((obj, item, index) => {
      obj[item.name] = {
        index,
        type: item.type
      };
      return obj;
    }, {});
  }

  private _getFormattedFilterPayload(
    data: UniversalListFilterPayload[]
  ): UniversalListParams[] {
    return data.reduce((arr, item) => {
      item.items.forEach((itm) => {
        arr.push({
          column: item.key,
          operator: itm.operator,
          value: this._getSerializedFilterValue(itm.value)
        });
      });
      return arr;
    }, []);
  }

  private _getSerializedFilterValue(value: any) {
    // intentially don't return empty string, to allow
    // removing the whole operator after user clears the value
    // (which results in an empty string)
    // TODO: implement "is not empty" as an operator
    let res = null;
    if (value) { res = value; }

    // if the value is coming from a datepicker
    // which means it's a Date object
    // format it to a readable string that the parser can handle
    if (isDate(res)) {
      res = format(res, 'yyyy-MM-dd');
    }

    return res;
  }

  // TODO: merge _getPrioritizedSuggest and _getPrioritizedFilters
  //       and pass property down as a parameter
  private _getPrioritizedSuggest(state: UniversalListQuery, search: UniversalListQuery) {
    let currSuggest;
    if (search && search.suggest) {
      currSuggest = search.suggest;
    } else if (state && state.suggest) {
      currSuggest = state.suggest;
    }

    return currSuggest;
  }

  private _getPrioritizedFilters(state: UniversalListQuery, search: UniversalListQuery) {
    let currFilter;
    if (search && search.filter) {
      currFilter = search.filter;
    } else if (state && state.filter) {
      currFilter = state.filter;
    }

    return currFilter;
  }

  private _getSuggestUniqKey(entity: string, name: string) {
    return getSuggestUniqKey(entity, name);
  }

}
