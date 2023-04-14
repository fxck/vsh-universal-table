import omit from 'lodash-es/omit';
import { SuggestEntities } from '@app/modules/suggest';
import { ResetActionTypes, Reset } from '@app/modules/core';
import { Actions, ActionTypes } from './universal-list.action';
import { UniversalListState } from './universal-list.model';

const initialState = new UniversalListState();

export function UniversalListReducer(
  state = initialState,
  action: Actions | Reset
) {
  switch (action.type) {
    case ActionTypes.ColumnsLocalSuccess:
      return {
        ...state,
        columns: {
          ...state.columns,
          [action.payload.entity + '_' + action.meta]: action.payload.data.items
        },
        formats: action.payload.data.formats
      };

    case ActionTypes.SetParamsFiltersDone:
      const f = {
        [action.payload.subscriptionName]: action.payload.query
      };

      const p = {
        [action.payload.subscriptionName]: {
          limit: action.payload.limit,
          offset: action.payload.offset,
          sort: action.payload.sort,
          direction: action.payload.direction
        }
      };

      const returnState = {
        ...state,
        filters: {
          ...state.filters,
          ...f
        },
        params: {
          ...state.params,
          ...p
        },
        sessionFilters: {
          ...state.sessionFilters,
          ...f
        },
        sessionParams: {
          ...state.sessionParams,
          ...omit(p, [ 'limit', 'offet' ])
        }
      };

      // TODO: comment?
      if ( action.payload.entity === SuggestEntities.currencyRate
        && !action.payload.direction
        && !action.payload.limit
        && !action.payload.sort
        && !action.payload.offset) {

        return {
          ...returnState,
          params: {
            [action.payload.subscriptionName]: {
              limit: undefined,
              offset: undefined,
              sort: 'effectiveDate',
              direction: 'desc'
            }
          }
        };
      }

      return returnState;

    case ActionTypes.ResetParamsFilters:
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload]: {}
        }
      };

    case ActionTypes.WebsocketListUpdate:
    case ActionTypes.ListLocalSuccess:
      return {
        ...state,
        data: {
          ...state.data,
          [action.payload.subscriptionName]: {
            items: action.payload.items,
            total: action.payload.total
          }
        }
      };

    case ActionTypes.ListReset:
      return {
        ...state
      };

    case ActionTypes.RemoveForSubscriptionNameById:
      return {
        ...state,
        data: {
          ...state.data,
          [action.payload.subscriptionName]: {
            total: state.data[action.payload.subscriptionName].total - 1,
            items: state.data[action.payload.subscriptionName].items.filter(
              (item) => item.id !== action.payload.id
            )
          }
        }
      };

    // -- reset
    case ResetActionTypes.Reset:
      return {
        ...initialState
      };

    default:
      return state;
  }
}
