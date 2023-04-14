import { Action } from '@zerops/fe/core';
import {
  ActionLoadingsMeta,
  LoadingsAction
} from '@zerops/fe/loadings';
import {
  ErrorsAction,
  ActionErrorMeta
} from '@zerops/fe/errors';

import {
  ColumnsApiResponse,
  ListParams
} from './universal-list.model';

export enum ActionTypes {
  ColumnsRequest = '[Universal Table] Columns Request',
  ColumnsLocalSuccess = '[Universal Table] Columns Local Success',
  ColumnsFail = '[Universal Table] Columns fail',

  SetParamsFilters = '[Universal Table] Set Filters and Params',
  SetParamsFiltersDone = '[Universal Table] Set Filters and Params Done',
  ResetParamsFilters = '[Universal Table] Reset Filters and Params',

  ListRequest = '[Universal Table] List Request',
  ListLocalSuccess = '[Universal Table] List Local Success',
  ListFail = '[Universal Table] List Fail',
  ListReset = '[Universal Table] List Reset',

  RemoveForSubscriptionNameById = '[Universal Table] Remove For Subscription Name By Id',

  // -- websocket
  WebsocketListUpdate = '[Universal Table] Websocket List Update',
  RemoveSubscriptionRequest = '[Universal Table] Remove Subscription Request',
  RemoveSubscriptionLocalSuccess = '[Universal Table] Remove Subscription Local Success',
  RemoveSubscriptionFail = '[Universal Table] Remove Subscription Fail',
}

export class ColumnsRequest implements Action {
  readonly type = ActionTypes.ColumnsRequest;

  constructor(public payload: string, public meta: string) { }
}

export class ColumnsLocalSuccess implements Action {
  readonly type = ActionTypes.ColumnsLocalSuccess;
  payload: {
    entity: string;
    data: ColumnsApiResponse;
  };
  meta: string;

  constructor(_entity: string, _data: ColumnsApiResponse, _meta: string) {
    this.payload = {
      entity: _entity,
      data: _data
    };
    this.meta = _meta;
  }
}

export class ColumnsFail implements Action {
  readonly type = ActionTypes.ColumnsFail;
}

export class SetParamsFilters implements Action {
  readonly type = ActionTypes.SetParamsFilters;

  constructor(
    public payload: ListParams,
    public meta: { route: boolean, baseUrl: string }
  ) { }
}

export class SetParamsFiltersDone implements Action {
  readonly type = ActionTypes.SetParamsFiltersDone;

  constructor(public payload: ListParams) { }
}

export class ResetParamsFilters implements Action {
  readonly type = ActionTypes.ResetParamsFilters;

  constructor(public payload: string) { }
}

export class ListRequest implements Action, LoadingsAction, ErrorsAction {
  readonly type = ActionTypes.ListRequest;
  payload: {
    entity: string;
    baseUrl: string;
    subscriptionName: string;
    params: ListParams;
    suggest: string;
    filter: any[];
  };
  loadings: ActionLoadingsMeta = {
    add: {
      key: ActionTypes.ListRequest,
      type: 'local'
    }
  };
  errors: ActionErrorMeta = {
    reset: ActionTypes.ListFail
  };

  constructor(
    _entity: string,
    _baseUrl: string,
    _subscriptionName: string,
    _params?: ListParams,
    _suggest?: string,
    _filter?: any[]
  ) {
    this.payload = {
      entity: _entity,
      baseUrl: _baseUrl,
      subscriptionName: _subscriptionName,
      params: _params,
      suggest: _suggest,
      filter: _filter
    };
  }
}

export class ListLocalSuccess implements Action, LoadingsAction {
  readonly type = ActionTypes.ListLocalSuccess;
  payload: {
    subscriptionName: string;
    items: any[];
    total: number;
  };
  loadings: ActionLoadingsMeta = {
    remove:  ActionTypes.ListRequest
  };

  constructor(
    _subscriptionName: string,
    _items: any[],
    _total: number
  ) {
    this.payload = {
      subscriptionName: _subscriptionName,
      items: _items,
      total: _total
    };
  }
}

export class ListFail implements Action, LoadingsAction, ErrorsAction {
  readonly type = ActionTypes.ListFail;
  loadings: ActionLoadingsMeta = {
    remove: ActionTypes.ListRequest
  };
  errors: ActionErrorMeta;

  constructor(_err: string) {
    this.errors = {
      local: {
        [ActionTypes.ListFail]: _err
      }
    };
  }
}

export class ListReset implements Action {
  readonly type = ActionTypes.ListReset;

  constructor(public payload: string) { }
}

export class RemoveForSubscriptionNameById implements Action {
  readonly type = ActionTypes.RemoveForSubscriptionNameById;
  payload: {
    subscriptionName: string;
    id: string;
  };

  constructor(_subscriptionName: string, _id: string) {
    this.payload = {
      subscriptionName: _subscriptionName,
      id: _id
    };
  }
}

export class RemoveSubscriptionRequest implements Action {
  readonly type = ActionTypes.RemoveSubscriptionRequest;
  payload: {
    entity: string,
    baseUrl: string,
    subscriptionName: string
  };

  constructor(_subscriptionName: string, _entity: string, _baseUrl: string) {
    this.payload = {
      subscriptionName: _subscriptionName,
      entity: _entity,
      baseUrl: _baseUrl
    };
  }
}

export class RemoveSubscriptionLocalSuccess implements Action, LoadingsAction {
  readonly type = ActionTypes.RemoveSubscriptionLocalSuccess;
  loadings: ActionLoadingsMeta = {
    remove: ActionTypes.RemoveSubscriptionRequest
  };
}

export class RemoveSubscriptionFail implements Action, LoadingsAction, ErrorsAction {
  readonly type = ActionTypes.RemoveSubscriptionFail;
  loadings: ActionLoadingsMeta = {
    remove: ActionTypes.RemoveSubscriptionRequest
  };
  errors: ActionErrorMeta;

  constructor(_err: string) {
    this.errors = {
      local: {
        [ActionTypes.RemoveSubscriptionFail]: _err
      }
    };
  }
}

export class WebsocketListUpdate implements Action {
  readonly type = ActionTypes.WebsocketListUpdate;
  payload: {
    subscriptionName: string;
    items: any[];
    total: number;
  };

  constructor(
    _subscriptionName: string,
    _items: any[],
    _total: number
  ) {
    this.payload = {
      subscriptionName: _subscriptionName,
      items: _items,
      total: _total
    };
  }
}

export type Actions
  = ColumnsRequest
  | ColumnsLocalSuccess
  | ColumnsFail

  | SetParamsFilters
  | SetParamsFiltersDone
  | ResetParamsFilters

  | ListRequest
  | ListLocalSuccess
  | ListFail
  | ListReset

  | RemoveForSubscriptionNameById

  // -- websocket
  | WebsocketListUpdate
  | RemoveSubscriptionRequest
  | RemoveSubscriptionLocalSuccess
  | RemoveSubscriptionFail;
