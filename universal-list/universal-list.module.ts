import { NgModule, ModuleWithProviders } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { UniversalListReducer } from './universal-list.reducer';
import { ModuleTokens } from './universal-list.constant';
import { UniversalListEffect } from './universal-list.effect';
import { UniversalListSearchModule } from './modules/universal-list-search';
import { UniversalListDataModule } from './modules/universal-list-data';
import {
  UniversalListColumnFilterModule
} from './modules/universal-list-column-filter';
import { UniversalListBookmarksModule } from './modules/universal-list-bookmarks';

@NgModule({
  imports: [
    StoreModule.forFeature(
      ModuleTokens.featureKey,
      UniversalListReducer
    ),
    EffectsModule.forFeature([
      UniversalListEffect
    ])
  ]
})
export class UniversalListRootModule { }

@NgModule({
  imports: [
    UniversalListSearchModule,
    UniversalListDataModule,
    UniversalListColumnFilterModule,
    UniversalListBookmarksModule
  ],
  exports: [
    UniversalListSearchModule,
    UniversalListDataModule,
    UniversalListColumnFilterModule,
    UniversalListBookmarksModule
  ]
})
export class UniversalListModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: UniversalListRootModule
    };
  }
}
