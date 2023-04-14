import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { A11yModule } from '@angular/cdk/a11y';

import { SatPopoverModule } from '@zerops/fe/popover';
import { DimensionsModule } from '@zerops/fe/dimensions';

import { ScrollableModule } from '@app/modules/scrollable';
import { DisableMouseWheelModule } from '@app/modules/disable-mouse-wheel';
import {
  UniversalListSearchContainer,
  UniversalListSearchBookmarksDirective,
  UniversalListSearchSuggestLinkDirective
} from './universal-list-search.container';
import { UniversalListSearchItemModule } from './modules/universal-list-search-item';
import { SuggestedFiltersPipe } from './universal-list-search.pipe';
import { UniversalListSuggestItemModule } from './modules/universal-list-suggest-item';

@NgModule({
  declarations: [
    UniversalListSearchContainer,
    UniversalListSearchBookmarksDirective,
    UniversalListSearchSuggestLinkDirective,
    SuggestedFiltersPipe
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatCardModule,
    MatCheckboxModule,
    A11yModule,
    FlexLayoutModule,

    SatPopoverModule,
    DimensionsModule,

    ScrollableModule,
    DisableMouseWheelModule,
    UniversalListSearchItemModule,
    UniversalListSuggestItemModule
  ],
  exports: [
    UniversalListSearchContainer,
    UniversalListSearchBookmarksDirective,
    UniversalListSearchSuggestLinkDirective
  ]
})
export class UniversalListSearchModule { }
