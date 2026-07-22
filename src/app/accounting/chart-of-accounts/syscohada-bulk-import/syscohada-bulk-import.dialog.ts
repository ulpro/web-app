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
interface SYSCOHADADetail {
  numero: string;
  intitule: string;
}

interface SYSCOHADASousCompte {
  numero: string;
  intitule: string;
  details: SYSCOHADADetail[];
}

interface SYSCOHADACompte {
  numero: string;
  intitule: string;
  sous_comptes: SYSCOHADASousCompte[];
}

interface SYSCOHADAClasse {
  numero: string;
  intitule: string;
  comptes: SYSCOHADACompte[];
}

interface SYSCOHADAPlan {
  classes: SYSCOHADAClasse[];
}

interface GlAccountPayload {
  glCode: string;
  name: string;
  type: number;
  usage: number;
  manualEntriesAllowed: boolean;
}

export type ImportState = 'confirm' | 'importing' | 'done';

@Component({
  selector: 'mifosx-syscohada-bulk-import',
  templateUrl: './syscohada-bulk-import.dialog.html',
  styleUrls: ['./syscohada-bulk-import.dialog.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatProgressBar,
    MatIcon
  ]
})
export class SyscohadadBulkImportDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<SyscohadadBulkImportDialogComponent>);
  private accountingService = inject(AccountingService);
  private cdr = inject(ChangeDetectorRef);

  state: ImportState = 'confirm';
  /** All SYSCOHADA accounts to create (after deduplication). */
  accounts: GlAccountPayload[] = [];
  /** Total accounts in SYSCOHADA plan (before dedup). */
  planTotal = 0;
  /** Number of accounts already in Fineract (skipped). */
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
    const plan$ = from(fetch('/assets/plan_comptable_SYSCOHADA.json').then((r) => r.json() as Promise<SYSCOHADAPlan>));
    const existing$ = this.accountingService.getChartOfAccounts();

    forkJoin({ plan: plan$, existing: existing$ }).subscribe({
      next: ({ plan, existing }) => {
        const allAccounts = this.flatten(plan as SYSCOHADAPlan);
        const existingCodes = new Set<string>((existing as any[]).map((a: any) => String(a.glCode)));
        this.planTotal = allAccounts.length;
        this.accounts = allAccounts.filter((a) => !existingCodes.has(a.glCode));
        this.skippedCount = this.planTotal - this.accounts.length;
        this.total = this.accounts.length;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to load SYSCOHADA or existing accounts:', err)
    });
  }

  /**
   * Flatten all SYSCOHADA levels into Fineract GL account payloads.
   * usage: 2=HEADER (has children), 1=DETAIL (leaf node)
   */
  private flatten(plan: SYSCOHADAPlan): GlAccountPayload[] {
    const result: GlAccountPayload[] = [];

    for (const classe of plan.classes) {
      const type = this.typeFromClasse(classe.numero);
      result.push({
        glCode: classe.numero,
        name: classe.intitule,
        type,
        usage: 2,
        manualEntriesAllowed: false
      });

      for (const compte of classe.comptes) {
        const hasChildren = compte.sous_comptes && compte.sous_comptes.length > 0;
        result.push({
          glCode: compte.numero,
          name: compte.intitule,
          type,
          usage: hasChildren ? 2 : 1,
          manualEntriesAllowed: !hasChildren
        });

        for (const sousCompte of compte.sous_comptes) {
          const hasDetails = sousCompte.details && sousCompte.details.length > 0;
          result.push({
            glCode: sousCompte.numero,
            name: sousCompte.intitule,
            type,
            usage: hasDetails ? 2 : 1,
            manualEntriesAllowed: !hasDetails
          });

          for (const detail of sousCompte.details) {
            result.push({
              glCode: detail.numero,
              name: detail.intitule,
              type,
              usage: 1,
              manualEntriesAllowed: true
            });
          }
        }
      }
    }

    return result;
  }

  private typeFromClasse(num: string): number {
    switch (num) {
      case '1':
        return 3; // EQUITY
      case '2':
        return 1; // ASSET
      case '3':
        return 1; // ASSET
      case '4':
        return 1; // ASSET (tiers)
      case '5':
        return 1; // ASSET (trésorerie)
      case '6':
        return 5; // EXPENSE
      case '7':
        return 4; // INCOME
      case '8':
        return 5; // EXPENSE (HAO)
      case '9':
        return 5; // EXPENSE (analytique)
      default:
        return 1;
    }
  }

  startImport(): void {
    this.state = 'importing';
    this.current = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.errors = [];
    this.cdr.markForCheck();

    from(this.accounts)
      .pipe(
        concatMap((account) =>
          this.accountingService.createGlAccount({ ...account, locale: 'en' }).pipe(
            catchError((err) => {
              const msg = err?.error?.errors?.[0]?.defaultUserMessage ?? err?.message ?? 'Unknown error';
              this.errors.push(`${account.glCode} – ${msg}`);
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
