/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, OnChanges, OnDestroy, Input, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/** rxjs Imports */
import { finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

/** Custom Services */
import { ReportsService } from '../../reports.service';
import { SettingsService } from 'app/settings/settings.service';
import { ProgressBarService } from 'app/core/progress-bar/progress-bar.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/**
 * BIRT Component
 */
@Component({
  selector: 'mifosx-birt',
  templateUrl: './birt.component.html',
  imports: [
    ...STANDALONE_SHARED_IMPORTS
  ]
})
export class BirtComponent implements OnChanges, OnDestroy {
  private sanitizer = inject(DomSanitizer);
  private reportsService = inject(ReportsService);
  private settingsService = inject(SettingsService);
  private progressBarService = inject(ProgressBarService);

  /** Run Report Data */
  @Input() dataObject: any;

  /** substitute for resolver */
  hideOutput = true;
  /** trusted resource url for BIRT output */
  birtUrl: any;
  /** current blob URL to track and revoke */
  private currentBlobUrl: string | null = null;

  /**
   * Fetches run report data post changes in run report form.
   */
  ngOnChanges() {
    this.hideOutput = true;
    this.getRunReportData();
  }

  getRunReportData() {
    this.reportsService
      .getBirtRunReportData(
        this.dataObject.report.name,
        this.dataObject.formData,
        'default',
        this.settingsService.language.code,
        this.settingsService.dateFormat
      )
      .pipe(
        finalize(() => this.progressBarService.decrease()),
        catchError((error) => {
          console.error('Error loading BIRT report:', error);
          this.hideOutput = true;
          this.birtUrl = null;
          return of(null);
        })
      )
      .subscribe((res: any) => {
        if (res) {
          const contentType = res.headers.get('Content-Type');
          const outputType = this.dataObject.formData['output-type'] || 'HTML';
          const isDownloadFormat = ['XLS', 'XLSX', 'CSV'].includes(outputType);

          if (isDownloadFormat) {
            const file = new Blob([res.body], { type: contentType });
            const filecontent = URL.createObjectURL(file);
            
            const link = document.createElement('a');
            link.href = filecontent;
            
            let ext = 'xls';
            if (outputType === 'XLSX') ext = 'xlsx';
            if (outputType === 'CSV') ext = 'csv';
            
            link.download = `${this.dataObject.report.name}.${ext}`;
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
              document.body.removeChild(link);
              URL.revokeObjectURL(filecontent);
            }, 0);

            this.hideOutput = true;
          } else {
            const file = new Blob([res.body], { type: contentType });

            if (this.currentBlobUrl) {
              URL.revokeObjectURL(this.currentBlobUrl);
            }

            const filecontent = URL.createObjectURL(file);
            this.currentBlobUrl = filecontent;
            this.birtUrl = this.sanitizer.bypassSecurityTrustResourceUrl(filecontent);
            this.hideOutput = false;
          }
        }
      });
  }

  ngOnDestroy() {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
    }
  }
}
