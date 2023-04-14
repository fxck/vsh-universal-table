import { Observable, combineLatest } from 'rxjs';
import { filter as rxFilter, map } from 'rxjs/operators';
import omitBy from 'lodash-es/omitBy';
import isUndefined from 'lodash-es/isUndefined';
import uniqBy from 'lodash-es/uniqBy';

import { ColumnItem, FavCol, UniversalListQuery, ListParams } from './universal-list.model';
import { universableTableSerializer } from './universal-list-parser.service';

export const getFavoriteColumns$ = (
  columns$: Observable<ColumnItem[]>,
  favorites$: Observable<string>
) => {
  return combineLatest(
    columns$.pipe(rxFilter((r) => !!r)),
    favorites$.pipe(
      map((val) => val
        ? JSON.parse(val) as FavCol[]
        : undefined)
    )
  );
};

export const getUniqKey = (entity: string, key: string = '') => {
  return `universal-list_${entity}_${key}`;
};

export const serializeFilterAndParams = (
  filters: UniversalListQuery,
  params: ListParams,
  emptyQ = true
) => {

  let serializedFilter = emptyQ ? '' : undefined;
  if (filters) {
    const { filter, suggest } = filters;

    serializedFilter = universableTableSerializer({
      filter,
      suggest
    });
  }

  return {
    ...omitBy(params, isUndefined),
    ...omitBy({ q: serializedFilter }, isUndefined),
  };
};

export const filtersParamsEmpty = (filters: UniversalListQuery, params: ListParams) => {
  const r = (!filters || (filters && filters.filter && filters.filter.length === 0))
    && (!filters || !filters.suggest)
    && (!params || !params.direction)
    && (!params || !params.limit)
    && (!params || !params.offset)
    && (!params || !params.sort);

  return r;
};

export const listParamsToFiltersParams = (data: ListParams) => {
  return {
    filters: data.query,
    params: {
      limit: data.limit,
      offset: data.offset,
      sort: data.sort,
      direction: data.direction
    }
  };
};

export const getNormalizedColumns = (
  columns: ColumnItem[],
  favorites: FavCol[],
  defaultColumns: { [index: string]: boolean; } = {}
) => {

  // map of name:alias of api returned columns
  const colsAliasMap = {};

  // format and normalize cols data
  const cols = columns.map(({ name, alias, defaultView }) => {
    colsAliasMap[name] = alias;

    return {
      name,
      alias,
      // if column is defined in defaultColumns, show them
      value: defaultColumns
        && Object.getOwnPropertyNames(defaultColumns).length > 0
          ? !!defaultColumns[name]
          : defaultView
    };
  });

  // if user has favorited settings, normalize and return it
  if (favorites) {
    const fFavoritesMap = {};
    const fFavorites = favorites
      // remove favorite columns that do not exist on server anymore
      .filter(({ name }) => !!colsAliasMap[name])
      // use alias from server returned values
      .map((col) => {
        fFavoritesMap[col.name] = true;
        return {
          ...col,
          alias: colsAliasMap[col.name]
        };
      });

    // find any potential new columns not included in favorites
    const nCols = cols.filter((col) => !fFavoritesMap[col.name]);

    // combine and return the two
    return uniqBy([
      ...fFavorites,
      ...nCols
    ], 'name');
  }

  // ..otherwise return formated default columns
  return cols;
};
