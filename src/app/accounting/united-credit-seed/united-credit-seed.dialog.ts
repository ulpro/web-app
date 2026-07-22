import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatIcon } from '@angular/material/icon';
import { from, concatMap, catchError, of, timer } from 'rxjs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

import { UnitedCreditSeedService } from './united-credit-seed.service';

export type SeedPhase = 'confirm' | 'loading_state' | 'currencies' | 'offices' | 'roles' | 'staff' | 'users' | 'glAccounts' | 'tellers' | 'savingsProducts' | 'loanProducts' | 'clients' | 'done';

@Component({
  selector: 'mifosx-united-credit-seed',
  templateUrl: './united-credit-seed.dialog.html',
  styleUrls: ['./united-credit-seed.dialog.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatProgressBar,
    MatIcon
  ]
})
export class UnitedCreditSeedDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<UnitedCreditSeedDialogComponent>);
  private seedService = inject(UnitedCreditSeedService);
  private cdr = inject(ChangeDetectorRef);

  phase: SeedPhase = 'confirm';
  seedData: any = null;

  // Progress variables
  totalItems = 0;
  currentItem = 0;
  successCount = 0;
  errorCount = 0;
  skippedCount = 0;
  errors: string[] = [];

  get progress(): number {
    return this.totalItems > 0 ? Math.round((this.currentItem / this.totalItems) * 100) : 0;
  }

  ngOnInit(): void {
    this.seedService.getSeedData().subscribe({
      next: (data) => {
        this.seedData = data;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errors.push('Failed to load seed data JSON.');
        this.cdr.markForCheck();
      }
    });
  }

  startSeed(): void {
    if (!this.seedData) return;

    this.phase = 'loading_state';
    this.cdr.markForCheck();

    // 1. Preload existing state
    this.seedService.fetchExistingOffices().subscribe(() => {
      this.seedService.fetchExistingGLAccounts().subscribe(() => {
        this.runSeedSequence();
      });
    });
  }

  private runSeedSequence(): void {
    // Phase Currencies
    this.phase = 'currencies';
    this.resetCounters(this.seedData.currencies?.activate?.length || 0);
    this.seedService.runPhaseCurrencies(this.seedData.currencies?.activate || []).subscribe(() => {
      
      // Phase Offices
        this.phase = 'offices';
        if (this.seedData.offices) {
          this.totalItems = this.seedData.offices.length;
          this.seedService.runPhaseOffices(this.seedData.offices).subscribe(res => {
            this.processResult(res);
          }, undefined, () => {
            
            this.phase = 'roles';
            if (this.seedData.roles) {
              this.totalItems = this.seedData.roles.length;
              this.currentItem = 0;
              this.seedService.runPhaseRoles(this.seedData.roles).subscribe(res => {
                this.processResult(res);
              }, undefined, () => {
                
                this.phase = 'staff';
                if (this.seedData.staff) {
                  this.totalItems = this.seedData.staff.length;
                  this.currentItem = 0;
                  this.seedService.runPhaseStaff(this.seedData.staff).subscribe(res => {
                    this.processResult(res);
                  }, undefined, () => {

                    this.phase = 'users';
                    if (this.seedData.users) {
                      this.totalItems = this.seedData.users.length;
                      this.currentItem = 0;
                      this.seedService.runPhaseUsers(this.seedData.users).subscribe(res => {
                        this.processResult(res);
                      }, undefined, () => {
                        this.runRemainingPhases();
                      });
                    } else {
                      this.runRemainingPhases();
                    }
                  });
                } else {
                  this.runRemainingPhases();
                }
              });
            } else {
              this.runRemainingPhases();
            }
          });
        } else {
          this.runRemainingPhases();
        }
    });
  }

  private runRemainingPhases(): void {
    // Phase GL Accounts
    this.phase = 'glAccounts';
    const glAccounts = [...(this.seedData.gl_accounts?.headers || []), ...(this.seedData.gl_accounts?.details || [])];
    this.resetCounters(glAccounts.length);
    this.seedService.runPhaseGLAccounts(this.seedData.gl_accounts || {}).subscribe(res => {
      this.processResult(res);
    }, undefined, () => {
    
      // Phase Tellers
      this.phase = 'tellers';
      const tellers = this.seedData.tellers || [];
      this.resetCounters(tellers.length);
      this.seedService.runPhaseTellers(tellers).subscribe(res => {
        this.processResult(res);
      }, undefined, () => {
        
        // Phase Savings Products
        this.phase = 'savingsProducts';
        const savingsProducts = this.seedData.savings_products || [];
        this.resetCounters(savingsProducts.length);
        this.seedService.runPhaseSavingsProducts(savingsProducts).subscribe(res => {
          this.processResult(res);
        }, undefined, () => {
          
          // Phase Loan Products
          this.phase = 'loanProducts';
          const loanProducts = this.seedData.loan_products || [];
          this.resetCounters(loanProducts.length);
          this.seedService.runPhaseLoanProducts(loanProducts).subscribe(res => {
            this.processResult(res);
          }, undefined, () => {
            
            // Phase Clients
            this.phase = 'clients';
            const clients = this.seedData.clients || [];
            this.resetCounters(clients.length);
            this.seedService.runPhaseClients(clients).subscribe(res => {
              this.processResult(res);
            }, undefined, () => {
              this.phase = 'done';
              this.cdr.markForCheck();
            });
          });
        });
      });
    });
  }

  private resetCounters(total: number) {
    this.totalItems = total;
    this.currentItem = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.skippedCount = 0;
    this.cdr.markForCheck();
  }

  private processResult(res: any) {
    this.currentItem++;
    if (res && res.error) {
      this.errorCount++;
      let msg = 'Unknown error';
      if (typeof res.error === 'string') {
        msg = res.error;
      } else {
        msg = res.error?.error?.developerMessage || res.error?.message || 'Unknown error';
      }
      this.errors.push(`[${this.phase}] ${res.item} - ${msg}`);
    } else if (res && res.status === 'skipped') {
      this.skippedCount++;
    } else {
      this.successCount++;
    }
    this.cdr.markForCheck();
  }

  close(): void {
    this.dialogRef.close();
  }
}
