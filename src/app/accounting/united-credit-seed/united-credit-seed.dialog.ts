import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatIcon } from '@angular/material/icon';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import * as XLSX from 'xlsx';

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
export class UnitedCreditSeedDialogComponent {
  private dialogRef = inject(MatDialogRef<UnitedCreditSeedDialogComponent>);
  private seedService = inject(UnitedCreditSeedService);
  private cdr = inject(ChangeDetectorRef);

  phase: SeedPhase = 'confirm';
  seedData: any = null;

  totalItems = 0;
  currentItem = 0;
  successCount = 0;
  errorCount = 0;
  skippedCount = 0;
  errors: string[] = [];

  get progress(): number {
    return this.totalItems > 0 ? Math.round((this.currentItem / this.totalItems) * 100) : 0;
  }

  downloadTemplate(type: string) {
    const wb = XLSX.utils.book_new();

    if (type === 'Complet' || type === 'Parametrage') {
      const devises = [{ Code_Devise: 'XAF' }, { Code_Devise: 'USD' }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(devises), 'Devises');

      const roles = [{ Nom: 'Chef Agence', Description: 'Chef', Permissions: 'ALL_FUNCTIONS_READ' }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(roles), 'Roles');

      const staff = [{ Prenom: 'Jean', Nom: 'Dupont', Code_Agence: 'UC-DG', ID_Externe: 'STAFF-01', Is_Loan_Officer: true, Actif: true }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staff), 'Personnel');

      const users = [{ Username: 'jean.dupont', Nom_Role: 'Chef Agence', ID_Staff: 'STAFF-01' }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(users), 'Utilisateurs');
      
      const glHeaders = [{ Code: '10000', Nom: 'Capitaux propres', Type: 'EQUITY', Parent: '' }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(glHeaders), 'GL_Headers');

      const glDetails = [{ Code: '10100', Nom: 'Capital', Type: 'EQUITY', Parent: '10000' }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(glDetails), 'GL_Details');
    }

    if (type === 'Complet' || type === 'Agences') {
      const offices = [{ Code: 'UC-DG', Nom: 'Direction Générale', Ville: 'Douala', Region: 'Littoral', Parent: '', Role: 'Bureau racine' }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(offices), 'Agences');
      
      const tellers = [{ Code_Agence: 'UC-DG', Nom_Caisse: 'Caisse Principale', Limite_Cash_XAF: 5000000, Devises_Gerees: 'XAF, USD' }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tellers), 'Caisses');
    }

    if (type === 'Complet' || type === 'Clients') {
      const clients = [{ ID_Client: 'DEMO-01', Nom_Complet: 'Client 1', Type: 'Particulier', Code_Agence: 'UC-DG', Profession: 'Commerçant', Statut_KYC: 'CONFORME', Risque: 'Standard' }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clients), 'Clients');
    }

    if (type === 'Complet') {
      const savings = [{ Nom_Produit: 'Épargne Classique', Taux_Annuel_Pct: 2.5, Solde_Min_XAF: 5000, Frequence_Interets: 'Mensuelle' }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(savings), 'Produits_Epargne');

      const loans = [{ Nom_Produit: 'Microcrédit', Cible: 'Commerçants', Min_XAF: 50000, Max_XAF: 2000000, Duree_Min_Mois: 3, Duree_Max_Mois: 12, Taux_Annuel_Pct: 18, Modalite: 'Individuel' }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(loans), 'Produits_Pret');
    }

    XLSX.writeFile(wb, `Template_Import_${type}.xlsx`);
  }

  onFileChange(evt: any) {
    const target: DataTransfer = <DataTransfer>(evt.target);
    if (target.files.length !== 1) throw new Error('Cannot use multiple files');
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

      const parsedData: any = {};

      if (wb.SheetNames.includes('Devises')) {
        const devises = XLSX.utils.sheet_to_json(wb.Sheets['Devises']);
        parsedData.currencies = { activate: devises.map((d: any) => d.Code_Devise) };
      }

      if (wb.SheetNames.includes('Roles')) {
        const roles = XLSX.utils.sheet_to_json(wb.Sheets['Roles']);
        parsedData.roles = roles.map((r: any) => ({
          name: r.Nom, description: r.Description, permissions: r.Permissions ? [r.Permissions] : []
        }));
      }

      if (wb.SheetNames.includes('Personnel')) {
        const staff = XLSX.utils.sheet_to_json(wb.Sheets['Personnel']);
        parsedData.staff = staff.map((s: any) => ({
          firstname: s.Prenom, lastname: s.Nom, officeCode: s.Code_Agence, externalId: s.ID_Externe, isLoanOfficer: s.Is_Loan_Officer || false, isActive: s.Actif !== false, dateFormat: 'dd MMMM yyyy', locale: 'en'
        }));
      }

      if (wb.SheetNames.includes('Utilisateurs')) {
        const users = XLSX.utils.sheet_to_json(wb.Sheets['Utilisateurs']);
        parsedData.users = users.map((u: any) => ({
          username: u.Username, roleName: u.Nom_Role, staffExternalId: u.ID_Staff, sendPasswordToEmail: false
        }));
      }

      const glAccounts: any = { headers: [], details: [] };
      if (wb.SheetNames.includes('GL_Headers')) {
        const headers = XLSX.utils.sheet_to_json(wb.Sheets['GL_Headers']);
        glAccounts.headers = headers.map((h: any) => ({ code: String(h.Code), name: h.Nom, type: h.Type, usage: 'HEADER', parent: h.Parent ? String(h.Parent) : null }));
      }
      if (wb.SheetNames.includes('GL_Details')) {
        const details = XLSX.utils.sheet_to_json(wb.Sheets['GL_Details']);
        glAccounts.details = details.map((d: any) => ({ code: String(d.Code), name: d.Nom, type: d.Type, usage: 'DETAIL', parent: d.Parent ? String(d.Parent) : null }));
      }
      if (glAccounts.headers.length > 0 || glAccounts.details.length > 0) {
        parsedData.gl_accounts = glAccounts;
      }

      if (wb.SheetNames.includes('Agences')) {
        const agences = XLSX.utils.sheet_to_json(wb.Sheets['Agences']);
        parsedData.offices = agences.map((a: any) => ({
          code: a.Code, name: a.Nom, city: a.Ville, region: a.Region, parent: a.Parent, role: a.Role
        }));
      }

      if (wb.SheetNames.includes('Caisses')) {
        const caisses = XLSX.utils.sheet_to_json(wb.Sheets['Caisses']);
        parsedData.tellers = caisses.map((c: any) => ({
          office: c.Code_Agence, name: c.Nom_Caisse, cash_limit_xaf: c.Limite_Cash_XAF, currencies: (c.Devises_Gerees || '').split(',').map((d: string) => d.trim())
        }));
      }

      if (wb.SheetNames.includes('Produits_Epargne')) {
        const epargnes = XLSX.utils.sheet_to_json(wb.Sheets['Produits_Epargne']);
        parsedData.savings_products = epargnes.map((s: any) => ({
          name: s.Nom_Produit, rate_annual_pct: s.Taux_Annuel_Pct, min_balance_xaf: s.Solde_Min_XAF, compounding: s.Frequence_Interets
        }));
      }

      if (wb.SheetNames.includes('Produits_Pret')) {
        const prets = XLSX.utils.sheet_to_json(wb.Sheets['Produits_Pret']);
        parsedData.loan_products = prets.map((p: any) => ({
          name: p.Nom_Produit, target: p.Cible, min_xaf: p.Min_XAF, max_xaf: p.Max_XAF, duration_months_min: p.Duree_Min_Mois, duration_months_max: p.Duree_Max_Mois, rate_annual_pct: p.Taux_Annuel_Pct, modality: p.Modalite
        }));
      }

      if (wb.SheetNames.includes('Clients')) {
        const clients = XLSX.utils.sheet_to_json(wb.Sheets['Clients']);
        parsedData.clients = clients.map((c: any) => ({
          id: c.ID_Client, name: c.Nom_Complet, type: c.Type, office: c.Code_Agence, profession: c.Profession, kyc_status: c.Statut_KYC, risk: c.Risque
        }));
      }

      this.seedData = parsedData;
      this.cdr.markForCheck();
    };
    reader.readAsBinaryString(target.files[0]);
  }

  startSeed(): void {
    if (!this.seedData) return;
    this.phase = 'loading_state';
    this.cdr.markForCheck();

    this.seedService.fetchExistingOffices().subscribe(() => {
      this.seedService.fetchExistingGLAccounts().subscribe(() => {
        this.runSeedSequence();
      });
    });
  }

  private runSeedSequence(): void {
    this.phase = 'currencies';
    if (this.seedData.currencies?.activate?.length) {
      this.resetCounters(this.seedData.currencies.activate.length);
      this.seedService.runPhaseCurrencies(this.seedData.currencies.activate).subscribe(() => this.runPhaseOffices());
    } else {
      this.runPhaseOffices();
    }
  }

  private runPhaseOffices(): void {
    this.phase = 'offices';
    if (this.seedData.offices) {
      this.totalItems = this.seedData.offices.length;
      this.seedService.runPhaseOffices(this.seedData.offices).subscribe(res => {
        this.processResult(res);
      }, undefined, () => this.runPhaseRoles());
    } else {
      this.runPhaseRoles();
    }
  }

  private runPhaseRoles(): void {
    this.phase = 'roles';
    if (this.seedData.roles) {
      this.totalItems = this.seedData.roles.length;
      this.seedService.runPhaseRoles(this.seedData.roles).subscribe(res => {
        this.processResult(res);
      }, undefined, () => this.runPhaseStaff());
    } else {
      this.runPhaseStaff();
    }
  }

  private runPhaseStaff(): void {
    this.phase = 'staff';
    if (this.seedData.staff) {
      this.totalItems = this.seedData.staff.length;
      this.seedService.runPhaseStaff(this.seedData.staff).subscribe(res => {
        this.processResult(res);
      }, undefined, () => this.runPhaseUsers());
    } else {
      this.runPhaseUsers();
    }
  }

  private runPhaseUsers(): void {
    this.phase = 'users';
    if (this.seedData.users) {
      this.totalItems = this.seedData.users.length;
      this.seedService.runPhaseUsers(this.seedData.users).subscribe(res => {
        this.processResult(res);
      }, undefined, () => this.runPhaseGLAccounts());
    } else {
      this.runPhaseGLAccounts();
    }
  }

  private runPhaseGLAccounts(): void {
    this.phase = 'glAccounts';
    if (this.seedData.gl_accounts) {
      const gls = [...(this.seedData.gl_accounts.headers || []), ...(this.seedData.gl_accounts.details || [])];
      this.resetCounters(gls.length);
      this.seedService.runPhaseGLAccounts(this.seedData.gl_accounts).subscribe(res => {
        this.processResult(res);
      }, undefined, () => this.runPhaseTellers());
    } else {
      this.runPhaseTellers();
    }
  }

  private runPhaseTellers(): void {
    this.phase = 'tellers';
    if (this.seedData.tellers) {
      this.resetCounters(this.seedData.tellers.length);
      this.seedService.runPhaseTellers(this.seedData.tellers).subscribe(res => {
        this.processResult(res);
      }, undefined, () => this.runPhaseSavingsProducts());
    } else {
      this.runPhaseSavingsProducts();
    }
  }

  private runPhaseSavingsProducts(): void {
    this.phase = 'savingsProducts';
    if (this.seedData.savings_products) {
      this.resetCounters(this.seedData.savings_products.length);
      this.seedService.runPhaseSavingsProducts(this.seedData.savings_products).subscribe(res => {
        this.processResult(res);
      }, undefined, () => this.runPhaseLoanProducts());
    } else {
      this.runPhaseLoanProducts();
    }
  }

  private runPhaseLoanProducts(): void {
    this.phase = 'loanProducts';
    if (this.seedData.loan_products) {
      this.resetCounters(this.seedData.loan_products.length);
      this.seedService.runPhaseLoanProducts(this.seedData.loan_products).subscribe(res => {
        this.processResult(res);
      }, undefined, () => this.runPhaseClients());
    } else {
      this.runPhaseClients();
    }
  }

  private runPhaseClients(): void {
    this.phase = 'clients';
    if (this.seedData.clients) {
      this.resetCounters(this.seedData.clients.length);
      this.seedService.runPhaseClients(this.seedData.clients).subscribe(res => {
        this.processResult(res);
      }, undefined, () => {
        this.phase = 'done';
        this.cdr.markForCheck();
      });
    } else {
      this.phase = 'done';
      this.cdr.markForCheck();
    }
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
      this.errors.push(`[${this.phase}] ${res.item || ''} - ${msg}`);
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
