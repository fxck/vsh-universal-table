import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Store, select } from '@ngrx/store';
import {
  switchMap,
  map,
  catchError,
  take,
  filter,
  distinctUntilChanged
} from 'rxjs/operators';
import { of, zip } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { BaseAuthorizedEffect } from '@app/services';
import { State, ApiError } from '@app/models';
import {
  ColumnsRequest,
  ActionTypes,
  ColumnsLocalSuccess,
  ColumnsFail,
  SetParamsFilters,
  ListRequest,
  ListLocalSuccess,
  ListFail,
  WebsocketListUpdate,
  RemoveSubscriptionRequest,
  RemoveSubscriptionLocalSuccess,
  RemoveSubscriptionFail,
  SetParamsFiltersDone
} from './universal-list.action';
import { UniversalListApi } from './universal-list.api';
import { UniversalListQuery } from './universal-list.model';
import {
  getParamsAndFiltersForSubscriptionName,
  getSessionFiltersForSubscriptionName,
  getSessionParamsForSubscriptionName,
  getColumnsForEntity
} from './universal-list.selector';
import {
  WebsocketMessage,
  WebsocketActionTypes
} from '@app/modules/websockets';
import { ClouddnsWebsocketActionTypes } from '@app/modules/clouddns-websockets';
import { ErrorTranslationService } from '@app/services/error-translation.service';
import { serializeFilterAndParams, filtersParamsEmpty, listParamsToFiltersParams } from './universal-list-data.utils';
import { Go } from '@app/actions/router.action';
import { Router } from '@angular/router';

@Injectable()
export class UniversalListEffect extends BaseAuthorizedEffect {

  private _onSetParamsFilters$ = this._actions$.pipe(
    ofType<SetParamsFilters>(ActionTypes.SetParamsFilters)
  );

  @Effect()
  private _onColumnsRequest$ = this._actions$.pipe(
    ofType<ColumnsRequest>(ActionTypes.ColumnsRequest),
    switchMap((action) => this._store.pipe(
      select(getColumnsForEntity(action.payload, action.meta)),
      filter((r) => !r),
      switchMap(() => this._api
        .columns$(action.payload, action.meta)
        .pipe(
          map((results) => new ColumnsLocalSuccess(
            action.payload,
            results,
            action.meta
          )),
          catchError(() => of(new ColumnsFail()))
        )
      ))
    )
  );

  @Effect()
  private _onSetFiltersDone$ = this._onSetParamsFilters$.pipe(
    map(({ payload }) => new SetParamsFiltersDone(payload))
  );

  @Effect()
  private _onSetFiltersListRequest$ = this._onSetParamsFilters$.pipe(
    switchMap(({ payload, meta }) => {
      return zip(
        this._store.pipe(select(getSessionFiltersForSubscriptionName(payload.subscriptionName))),
        this._store.pipe(select(getSessionParamsForSubscriptionName(payload.subscriptionName)))
      ).pipe(
        take(1),
        map(([ sf, sp ]) => ({ sf, sp, payload, meta }))
      );
    }),
    filter(({ payload, sf, sp, meta }) => {

      if (meta || filtersParamsEmpty(sf, sp)) {
        return true;
      }

      const r = listParamsToFiltersParams(payload);

      const { filters, params } = r;

      return !filtersParamsEmpty(filters, params);
    }),
    distinctUntilChanged(),
    map(({ payload, meta }) => new ListRequest(
      payload.entity,
      meta.baseUrl,
      payload.subscriptionName,
      {
        query: payload.query,
        limit: payload.limit,
        offset: payload.offset,
        sort: payload.sort,
        direction: payload.direction
      },
      payload.suggest,
      payload.filter
    ))
  );

  @Effect()
  private _onSetFiltersLoadSession$ = this._onSetParamsFilters$.pipe(
    switchMap(({ payload, meta }) => zip(
      this._store.pipe(select(getSessionFiltersForSubscriptionName(payload.subscriptionName))),
      this._store.pipe(select(getSessionParamsForSubscriptionName(payload.subscriptionName)))
      ).pipe(
        take(1),
        map(([ sf, sp ]) =>  ({ payload, meta, sf, sp }))
      )
    ),
    map(({ payload, meta, sf, sp }) => {
      const r = listParamsToFiltersParams(payload);

      const { filters, params } = r;

      if ((filtersParamsEmpty(filters, params) && (sf || sp) && !meta.route)
        || meta.baseUrl === 'clouddns' && filtersParamsEmpty(filters, {}) && (sf || sp) && !meta.route) {

        let route = this._router.routerState.root;

        const routeCommand = [ '/' ];

        while (route.firstChild) {
          route = route.firstChild;
          routeCommand.push(...route.snapshot.url.map((u) => u.path));
        }

        const sfp = serializeFilterAndParams(sf, sp, false);

        const g = new Go({
          path: [ ...routeCommand, sfp ],
          extras: { queryParamsHandling: 'preserve' }
        });

        return g;
      }

    }),
    filter((a) => !!a),
    distinctUntilChanged()
  );

  @Effect()
  private _onListRequest$ = this._actions$.pipe(
    ofType<ListRequest>(ActionTypes.ListRequest),
    switchMap((action) =>
      this._store.pipe(
        select(getParamsAndFiltersForSubscriptionName(
          action.payload.subscriptionName
        )),
        take(1),
        map((paramsAndFilters) => {
          return {
            action,
            paramsAndFilters
          };
        })
      )
    ),
    switchMap((data) => this._api
      .list$(
        data.action.payload.entity,
        data.action.payload.baseUrl,
        data.action.payload.subscriptionName,
        this._formatFiltersToApi(data.action.payload.params ? data.action.payload.params.query : undefined),
        data.paramsAndFilters.params ? data.paramsAndFilters.params : data.action.payload.params,
        data.paramsAndFilters.filters ?  data.paramsAndFilters.filters.suggest : data.action.payload.suggest,
        data.action.payload.filter ? data.action.payload.filter : data.paramsAndFilters.filters.filter
      )
      .pipe(
        map((result) => new ListLocalSuccess(
          data.action.payload.subscriptionName,
          result.items,
          result.totalHits
        )),
        catchError((err: ApiError) => this._errorTranslate
          .get$(err)
          .pipe(
            map((message) => new ListFail(message))
          )
        )
      )
    )
  );

  @Effect()
  private _onWs$ = this._actions$.pipe(
    ofType<WebsocketMessage>(
      WebsocketActionTypes.Message,
      ClouddnsWebsocketActionTypes.Message
    ),
    filter((action) => action.payload.type === 'search'),
    map(({ payload }) => new WebsocketListUpdate(
      payload.subscriptionName,
      payload.data.items,
      payload.data.totalHits
    ))
  );

  @Effect()
  private _onRemoveSubscription$ = this._actions$.pipe(
    ofType<RemoveSubscriptionRequest>(ActionTypes.RemoveSubscriptionRequest),
    switchMap(({ payload }) => this._api
      .removeSubscription$(
        payload.entity,
        payload.baseUrl,
        payload.subscriptionName
      )
      .pipe(
        map(() => new RemoveSubscriptionLocalSuccess()),
        catchError((err: ApiError) => this._translate
          .get('UL.UNSUBSCRIBE_ERROR')
          .pipe(
            map((message) => new RemoveSubscriptionFail(
              this._errorTranslate.getErrorMessage(message, err)
            ))
          )
        )
      )
    )
  );

  constructor(
    private _actions$: Actions,
    private _store: Store<State>,
    private _api: UniversalListApi,
    private _router: Router,
    private _translate: TranslateService,
    private _errorTranslate: ErrorTranslationService
  ) {
    super(_actions$, _store);
  }

  private _formatFiltersToApi(query: UniversalListQuery) {
    return query
      ? query.filter.map(({ column, operator, value }) => ({
          name: column,
          operator,
          value
        }))
      : [];
  }
}
