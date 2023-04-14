import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { NgBooleanPipesModule } from 'angular-pipes';
import { DisableMouseWheelModule } from '@app/modules/disable-mouse-wheel';
import { UniversalListSearchItemComponent } from './universal-list-search-item.component';

@NgModule({
  declarations: [ UniversalListSearchItemComponent ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FlexLayoutModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatButtonToggleModule,
    MatButtonModule,
    NgBooleanPipesModule,
    MatIconModule,
    MatCheckboxModule,
    DisableMouseWheelModule
  ],
  exports: [ UniversalListSearchItemComponent ]
})
export class UniversalListSearchItemModule {

}
