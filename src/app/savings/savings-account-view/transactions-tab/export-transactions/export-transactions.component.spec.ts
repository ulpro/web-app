/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { of } from 'rxjs';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { TranslateModule } from '@ngx-translate/core';

import { ExportTransactionsComponent } from './export-transactions.component';
import { ReportsService } from 'app/reports/reports.service';
import { SettingsService } from 'app/settings/settings.service';
import { Dates } from 'app/core/utils/dates';

describe('ExportTransactionsComponent', () => {
  let component: ExportTransactionsComponent;
  let fixture: ComponentFixture<ExportTransactionsComponent>;
  let mockReportsService: jest.Mocked<ReportsService>;
  let mockDateUtils: jest.Mocked<Dates>;

  beforeEach(async () => {
    mockReportsService = {
      getPentahoRunReportData: jest.fn(() =>
        of({
          headers: {
            get: () => 'application/pdf'
          },
          body: new ArrayBuffer(8)
        })
      )
    } as unknown as jest.Mocked<ReportsService>;

    mockDateUtils = {
      formatDate: jest.fn().mockReturnValueOnce('12 May 2026').mockReturnValueOnce('13 May 2026')
    } as unknown as jest.Mocked<Dates>;

    await TestBed.configureTestingModule({
      imports: [
        ExportTransactionsComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            parent: {
              parent: {
                data: of({
                  savingsAccountData: {
                    accountNo: '000000001',
                    officeId: 1
                  }
                })
              }
            }
          }
        },
        { provide: ReportsService, useValue: mockReportsService },
        {
          provide: SettingsService,
          useValue: {
            dateFormat: 'dd MMMM yyyy',
            language: { code: 'en' },
            businessDate: new Date(2026, 4, 13)
          }
        },
        { provide: Dates, useValue: mockDateUtils },
        provideNativeDateAdapter(),
        provideAnimationsAsync()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ExportTransactionsComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  it('should send R_accountNo and R_OfficeId when generating pentaho report', () => {
    component.transactionsReportForm.patchValue({
      fromDate: new Date(2026, 4, 12),
      toDate: new Date(2026, 4, 13)
    });

    component.generate();

    expect(mockReportsService.getPentahoRunReportData).toHaveBeenCalledWith(
      'Client Saving Transactions',
      {
        'output-type': 'PDF',
        R_startDate: '12 May 2026',
        R_endDate: '13 May 2026',
        R_accountNo: '000000001',
        R_OfficeId: 1
      },
      'default',
      'en',
      'dd MMMM yyyy'
    );
  });
});
