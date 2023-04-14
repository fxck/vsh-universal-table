import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {
  ColumnsApiResponse,
  ListResult,
  ListParams
} from './universal-list.model';

@Injectable({
  providedIn: 'root'
})
export class UniversalListApi {
  constructor(private _http: HttpClient) { }

  columns$(entity: string, baseUrl: string) {
    return this._http.get<ColumnsApiResponse>(
      `/${baseUrl}/${entity}/search/columns`,
      {}
    );
  }

  list$(
    entity: string,
    baseUrl: string,
    subscriptionName: string,
    filter?: any[],
    params: ListParams = {},
    suggest?: string,
    hardFilter?: any[]
  ) {
    const { limit, offset, sort, direction } = params;

    return this._http.post<ListResult>(
      `/${baseUrl}/${entity}/search`,
      {
        subscriptionName,
        receiverId: this._getReceiverId(baseUrl),
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
        text: suggest ? suggest : undefined,
        search: filter
          ? this._removeEmptyNames([ ...filter, ...hardFilter ])
          : this._removeEmptyNames(hardFilter),
        sort: sort && direction
          ? [
            {
              name: sort,
              ascending: direction && direction === 'asc'
            }
          ]
          : undefined
      }
    );
  }

  export$(
    entity: string,
    baseUrl: string,
    exportFormat: string,
    activeColumns: string[],
    filter?: any[],
    params: ListParams = {},
    suggest?: string
  ) {
    const { offset, sort, direction } = params;

    return this._http.post<{ value: string; }>(
      `/${baseUrl}/${entity}/search/export`,
      {
        limit: 10000000000,
        offset: offset ? parseInt(offset, 10) : 0,
        text: suggest ? suggest : undefined,
        search: filter
          ? this._removeEmptyNames(filter)
          : [],
        sort: sort && direction
          ? [
            {
              name: sort,
              ascending: direction && direction === 'asc'
            }
          ]
          : undefined,
        format: exportFormat,
        columns: activeColumns.filter((column) => column !== '_link' && column !== '_options')
      }
    );
  }

  removeSubscription$(
    entity: string,
    baseUrl: string,
    subscriptionName: string,
  ) {
    const receiverId = this._getReceiverId(baseUrl);
    return this._http.delete(
      `/${baseUrl}/${entity}/search/${receiverId}/${subscriptionName}`
    );
  }

  private _removeEmptyNames(data: any[]) {
    return data && data.length
      ? data.filter((itm) => itm && !!itm.name)
      : [];
  }

  private _getReceiverId(baseUrl: string) {
    if (baseUrl === 'clouddns') {
      return window.sessionStorage.getItem('cloudDnsReceiverId');
    }

    return window.sessionStorage.getItem('receiverId');
  }

}
