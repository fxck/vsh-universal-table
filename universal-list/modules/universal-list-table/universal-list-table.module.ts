import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { NestedPathPipeModule } from '@app/modules/nested-path-pipe';
import {
  UniversalListTableComponent,
  UniveralListTableCellTemplateDirective,
  UniveralListTableLinkDirective,
  EnumTranslatePipe
} from './universal-list-table.component';

@NgModule({
  declarations: [
    UniversalListTableComponent,
    UniveralListTableCellTemplateDirective,
    UniveralListTableLinkDirective,
    EnumTranslatePipe
  ],
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    TranslateModule,
    NestedPathPipeModule
  ],
  exports: [
    UniversalListTableComponent,
    UniveralListTableCellTemplateDirective,
    UniveralListTableLinkDirective
  ]
})
export class UniversalListTableModule { }
