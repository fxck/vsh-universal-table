import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { SatPopoverModule } from '@ncstate/sat-popover';

import { ScrollableModule } from '@app/modules/scrollable';
import {
  UniversalListDataContainer,
  UniversalListDataColumnFilterDirective
} from './universal-list-data.container';
import { UniversalListTableModule } from '../universal-list-table';

@NgModule({
  declarations: [
    UniversalListDataContainer,
    UniversalListDataColumnFilterDirective
  ],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSelectModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    FlexLayoutModule,
    ReactiveFormsModule,

    TranslateModule.forChild(),
    SatPopoverModule,

    ScrollableModule,
    UniversalListTableModule
  ],
  exports: [
    UniversalListDataContainer,
    UniversalListDataColumnFilterDirective,
    UniversalListTableModule
  ]
})
export class UniversalListDataModule { }
