/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import {
  MatTableDataSource,
  MatTable,
  MatColumnDef,
  MatHeaderCellDef,
  MatHeaderCell,
  MatCellDef,
  MatCell,
  MatHeaderRowDef,
  MatHeaderRow,
  MatRowDef,
  MatRow
} from '@angular/material/table';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { RouterLink } from '@angular/router';

import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

@Component({
  selector: 'mifosx-cemac-codes',
  templateUrl: './cemac-codes.component.html',
  styleUrls: ['./cemac-codes.component.scss'],
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatTable,
    MatSort,
    MatSortHeader,
    MatPaginator,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    FaIconComponent,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    RouterLink
  ]
})
export class CemacCodesComponent implements OnInit {
  /** CEMAC Codes data. */
  cemacCodesData: any;
  /** Columns to be displayed in CEMAC Codes table. */
  displayedColumns: string[] = ['pcemfCode', 'cobacCode', 'libelleCobac', 'classePcemf', 'etatSesame'];
  /** Data source for CEMAC Codes table. */
  dataSource!: MatTableDataSource<any>;

  /** Paginator for CEMAC Codes table. */
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  /** Sorter for CEMAC Codes table. */
  @ViewChild(MatSort, { static: true }) sort!: MatSort;

  /**
   * Retrieves the CEMAC codes data from `resolve`.
   * @param {ActivatedRoute} route Activated Route.
   */
  constructor(private route: ActivatedRoute) {
    this.route.data.subscribe((data: { cemacCodes: any }) => {
      this.cemacCodesData = data.cemacCodes;
    });
  }

  /**
   * Sets the CEMAC Codes table.
   */
  ngOnInit() {
    this.setCodes();
  }

  /**
   * Initializes the data source, paginator and sorter for CEMAC Codes table.
   */
  setCodes() {
    this.dataSource = new MatTableDataSource(this.cemacCodesData);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Filters data in CEMAC Codes table based on passed value.
   * @param {string} filterValue Value to filter data.
   */
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}
