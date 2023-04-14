import { Pipe, PipeTransform } from '@angular/core';

import { Store, select } from '@ngrx/store';

import { State } from '@app/models';
import { getSuggestResults } from '@app/modules/suggest';
import { getSuggestUniqKey } from './universal-list-search.utils';

@Pipe({
  name: 'suggestedFilters',
  pure: true
})
export class SuggestedFiltersPipe implements PipeTransform {
  transform(name: string, entity: string) {
    return this._store.pipe(select(
      getSuggestResults(this._getSuggestUniqKey(entity, name))
    ));
  }

  constructor(private _store: Store<State>) { }

  private _getSuggestUniqKey(entity: string, name: string) {
    return getSuggestUniqKey(entity, name);
  }
}
