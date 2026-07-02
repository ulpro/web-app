/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions
} from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** Custom Models */
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
  titre: string;
  reference: string;
  classes: SYSCOHADAClasse[];
}

interface SelectedSYSCOHADA {
  glCode: string;
  name: string;
  type: number;
}

@Component({
  selector: 'mifosx-syscohada-import',
  templateUrl: './syscohada-import.dialog.html',
  styleUrls: ['./syscohada-import.dialog.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatIcon,
    MatIconButton,
    MatProgressSpinner
  ]
})
export class SyscohadadImportDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<SyscohadadImportDialogComponent>);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  public data = inject(MAT_DIALOG_DATA);

  syscohada: SYSCOHADAPlan | null = null;
  selectedAccount: SelectedSYSCOHADA | null = null;
  expandedClasses: Set<string> = new Set();
  expandedComptes: Set<string> = new Set();
  expandedSousComptes: Set<string> = new Set();

  constructor() {}

  ngOnInit() {
    this.loadSYSCOHADA();
  }

  /**
   * Loads SYSCOHADA plan from JSON file using native fetch to bypass HTTP interceptors.
   */
  loadSYSCOHADA(): void {
    fetch('/assets/plan_comptable_SYSCOHADA.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        return response.json() as Promise<SYSCOHADAPlan>;
      })
      .then((data) => {
        this.ngZone.run(() => {
          this.syscohada = data;
          this.cdr.markForCheck();
        });
      })
      .catch((error) => {
        console.error('Error loading SYSCOHADA plan:', error);
      });
  }

  /**
   * Toggle class expansion.
   */
  toggleClass(classeNumero: string): void {
    if (this.expandedClasses.has(classeNumero)) {
      this.expandedClasses.delete(classeNumero);
    } else {
      this.expandedClasses.add(classeNumero);
    }
  }

  /**
   * Toggle compte expansion.
   */
  toggleCompte(key: string): void {
    if (this.expandedComptes.has(key)) {
      this.expandedComptes.delete(key);
    } else {
      this.expandedComptes.add(key);
    }
  }

  /**
   * Toggle sous-compte expansion.
   */
  toggleSousCompte(key: string): void {
    if (this.expandedSousComptes.has(key)) {
      this.expandedSousComptes.delete(key);
    } else {
      this.expandedSousComptes.add(key);
    }
  }

  /**
   * Selects a SYSCOHADA account.
   */
  selectAccount(glCode: string, name: string, classeNumero: string): void {
    const type = this.getTypeFromClasse(classeNumero);
    this.selectedAccount = { glCode, name, type };
    this.cdr.markForCheck();
  }

  /**
   * Maps SYSCOHADA classe number to Fineract GL account type.
   */
  private getTypeFromClasse(classeNumero: string): number {
    switch (classeNumero) {
      case '1': // Comptes de Ressources Durables => EQUITY + LIABILITY
        return 3; // EQUITY (preferred for class 1)
      case '2': // Comptes d'Actif Immobilisé => ASSET
        return 1;
      case '3': // Comptes de Stocks => ASSET
        return 1;
      case '4': // Comptes de Tiers => mixed (CLIENT/PAYABLE)
        return 1; // Default to ASSET for receivables
      case '5': // Comptes de Trésorerie => ASSET
        return 1;
      case '6': // Charges des Activités Ordinaires => EXPENSE
        return 5;
      case '7': // Produits des Activités Ordinaires => INCOME
        return 4;
      case '8': // Charges & Produits HAO => EXPENSE/INCOME
        return 5; // Default to EXPENSE
      case '9': // Comptabilité Analytique => Custom handling
        return 5; // Default to EXPENSE
      default:
        return 1;
    }
  }

  /**
   * Validates and confirms the selection.
   */
  confirm(): void {
    if (this.selectedAccount) {
      this.dialogRef.close(this.selectedAccount);
    }
  }

  /**
   * Cancels the dialog.
   */
  cancel(): void {
    this.dialogRef.close();
  }

  /**
   * Gets the parent CSS class for row highlighting.
   */
  isSelected(glCode: string, name: string): boolean {
    return this.selectedAccount?.glCode === glCode && this.selectedAccount?.name === name;
  }
}
