/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { UntypedFormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

/** Custom Services */
import { ReportsService } from 'app/reports/reports.service';
import { SettingsService } from 'app/settings/settings.service';
import { Dates } from 'app/core/utils/dates';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/**
 * Export Client Savings Transactions Component
 */
@Component({
  selector: 'mifosx-export-transactions',
  templateUrl: './export-transactions.component.html',
  styleUrls: ['./export-transactions.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent
  ]
})
export class ExportTransactionsComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);
  private reportsService = inject(ReportsService);
  private formBuilder = inject(UntypedFormBuilder);
  private dateUtils = inject(Dates);
  private route = inject(ActivatedRoute);
  private settingsService = inject(SettingsService);

  /** Minimum date allowed. */
  minDate = new Date(2000, 0, 1);
  /** Maximum date allowed. */
  maxDate = new Date();
  /** Transactions Report Form */
  transactionsReportForm: any;
  /** substitute for resolver */
  hideOutput = true;
  /** trusted resource url for pentaho output */
  pentahoUrl: any;
  /** Savings account number required by Pentaho template (R_accountNo). */
  savingsAccountNo: string;
  /** Office id used by legacy Pentaho templates (R_OfficeId). */
  officeId: number | null = null;

  /**
   * Fetches savings account data from grandparent's `resolve`
   * @param {DomSanitizer} sanitizer DOM Sanitizer
   * @param {ReportsService} reportsService Reports Service
   * @param {FormBuilder} formBuilder Form Builder
   * @param {Dates} dateUtils Date Utils
   * @param {ActivatedRoute} route Activated Route
   * @param {SettingsService} settingsService Settings Service
   */
  constructor() {
    this.route.parent.parent.data.subscribe((data: { savingsAccountData: any }) => {
      this.savingsAccountNo = data.savingsAccountData.accountNo;
      this.officeId = data.savingsAccountData.officeId ?? null;
    });
  }

  ngOnInit() {
    this.maxDate = this.settingsService.businessDate;
    this.createTransactionsReportForm();
  }

  /**
   * Creates the transactions report form.
   */
  createTransactionsReportForm() {
    this.transactionsReportForm = this.formBuilder.group({
      fromDate: [
        '',
        Validators.required
      ],
      toDate: [
        '',
        Validators.required
      ]
    });
  }

  /**
   * Generates client savings transactions report.
   */
  generate() {
    const enDatePipe = new DatePipe('en-US');
    const dateFormat = this.settingsService.dateFormat;
    const data: any = {
      'output-type': 'PDF',
      R_startDate: enDatePipe.transform(this.transactionsReportForm.value.fromDate, dateFormat),
      R_endDate: enDatePipe.transform(this.transactionsReportForm.value.toDate, dateFormat),
      R_accountNo: this.savingsAccountNo
    };
    if (this.officeId !== null) {
      data.R_OfficeId = this.officeId;
    }
    this.reportsService
      .getPentahoRunReportData('Client Saving Transactions', data, 'default', 'en', this.settingsService.dateFormat)
      .subscribe((res: any) => {
        const contentType = res.headers.get('Content-Type');
        const file = new Blob([res.body], { type: contentType });
        const filecontent = URL.createObjectURL(file);
        this.pentahoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(filecontent);
        this.hideOutput = false;
      });
  }
}
