/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatIcon } from '@angular/material/icon';
import { from, forkJoin, concatMap, catchError, of } from 'rxjs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** Custom Services */
import { AccountingService } from '../../accounting.service';

/** Interfaces */
interface CemacCodeItem {
  pcemfCode: string;
  description: string;
}

export type ImportState = 'confirm' | 'importing' | 'done';

@Component({
  selector: 'mifosx-cemac-bulk-import',
  templateUrl: './cemac-bulk-import.dialog.html',
  styleUrls: ['./cemac-bulk-import.dialog.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatProgressBar,
    MatIcon
  ]
})
export class CemacBulkImportDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<CemacBulkImportDialogComponent>);
  private accountingService = inject(AccountingService);
  private cdr = inject(ChangeDetectorRef);

  state: ImportState = 'confirm';
  /** All CEMAC codes to create (after deduplication). */
  cemacCodes: CemacCodeItem[] = [];
  /** Total codes in JSON plan (before dedup). */
  planTotal = 0;
  /** Number of codes already in Fineract (skipped). */
  skippedCount = 0;
  total = 0;
  current = 0;
  successCount = 0;
  errorCount = 0;
  errors: string[] = [];

  get progress(): number {
    return this.total > 0 ? Math.round((this.current / this.total) * 100) : 0;
  }

  ngOnInit(): void {
    const plan$ = from(fetch('/assets/cemac_codes.json').then((r) => r.json() as Promise<CemacCodeItem[]>));
    const existing$ = this.accountingService.getCemacCodes();

    forkJoin({ plan: plan$, existing: existing$ }).subscribe({
      next: ({ plan, existing }) => {
        const existingCodes = new Set<string>((existing as any[]).map((a: any) => String(a.pcemfCode)));
        this.planTotal = plan.length;
        this.cemacCodes = plan.filter((a) => !existingCodes.has(a.pcemfCode));
        this.skippedCount = this.planTotal - this.cemacCodes.length;
        this.total = this.cemacCodes.length;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to load CEMAC codes or existing codes:', err)
    });
  }

  startImport(): void {
    this.state = 'importing';
    this.current = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.errors = [];
    this.cdr.markForCheck();

    from(this.cemacCodes)
      .pipe(
        concatMap((code) =>
          this.accountingService.createCemacCode({ ...code, locale: 'en' }).pipe(
            catchError((err) => {
              const msg = err?.error?.errors?.[0]?.defaultUserMessage ?? err?.message ?? 'Unknown error';
              this.errors.push(`${code.pcemfCode} – ${msg}`);
              this.errorCount++;
              return of(null);
            })
          )
        )
      )
      .subscribe({
        next: (result) => {
          this.current++;
          if (result !== null) {
            this.successCount++;
          }
          this.cdr.markForCheck();
        },
        complete: () => {
          this.state = 'done';
          this.cdr.markForCheck();
        }
      });
  }

  close(): void {
    this.dialogRef.close(this.state === 'done' ? { imported: this.successCount } : null);
  }
}
