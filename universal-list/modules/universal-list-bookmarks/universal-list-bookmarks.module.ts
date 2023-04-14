import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { DisableMouseWheelModule } from '@app/modules/disable-mouse-wheel';
import { UniversalListBookmarksContainer } from './universal-list-bookmarks.container';

@NgModule({
  declarations: [ UniversalListBookmarksContainer ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    DisableMouseWheelModule
  ],
  exports: [ UniversalListBookmarksContainer ]
})
export class UniversalListBookmarksModule { }
