import { createSelector, createFeatureSelector } from '@ngrx/store';

import { ModuleTokens } from './universal-list.constant';
import { UniversalListState } from './universal-list.model';

export const getSlice = createFeatureSelector<UniversalListState>(ModuleTokens.featureKey);

export const getColumnsForEntity = (entity: string, baseUrl: string) => {
  return createSelector(
    getSlice,
    (slice) => slice && slice.columns[entity + '_' + baseUrl]
  );
};

export const getFiltersForSubscriptionName = (name: string) => {
  return createSelector(
    getSlice,
    (slice) => slice && slice.filters[name]
  );
};

export const getParamsForSubscriptionName = (name: string) => {
  return createSelector(
    getSlice,
    (slice) => slice ? slice.params[name] : undefined
  );
};

export const getSessionFiltersForSubscriptionName = (name: string) => {
  return createSelector(
    getSlice,
    (slice) => slice && slice.sessionFilters[name]
  );
};

export const getSessionParamsForSubscriptionName = (name: string) => {
  return createSelector(
    getSlice,
    (slice) => slice ? slice.sessionParams[name] : undefined
  );
};

export const getDataForSubscriptionName = (name: string) => {
  return createSelector(
    getSlice,
    (slice) => slice ? slice.data[name] : undefined
  );
};

export const getIdBySubscriptionName = (name: string, id: string) => createSelector(
  getDataForSubscriptionName(name),
  (data) => {
    if (data && data.items) { return data.items.find((item) => item.id === id); }

    return undefined;
  }
);

export const getParamsAndFiltersForSubscriptionName = (name: string) => createSelector(
  getParamsForSubscriptionName(name),
  getFiltersForSubscriptionName(name),
  (params, filters) => ({ params, filters })
);

export const getExportFormats = createSelector(
    getSlice,
    (slice) => slice ? slice.formats : undefined
  );
