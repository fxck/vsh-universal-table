import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { DisableMouseWheelModule } from '@app/modules/disable-mouse-wheel';
import {
  UniversalListColumnFilterContainer
} from './universal-list-column-filter.container';

@NgModule({
  declarations: [ UniversalListColumnFilterContainer ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    DragDropModule,
    FlexLayoutModule,

    DisableMouseWheelModule
  ],
  exports: [ UniversalListColumnFilterContainer ]
})
export class UniversalListColumnFilterModule { }
