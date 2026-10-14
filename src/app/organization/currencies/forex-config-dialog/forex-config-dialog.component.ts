import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ForexService } from '../../../accounting/forex/forex.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-forex-config-dialog',
  templateUrl: './forex-config-dialog.component.html',
  styleUrls: ['./forex-config-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCardModule
  ]
})
export class ForexConfigDialogComponent implements OnInit {
  configForm: FormGroup;
  glAccounts: any[] = [];
  isLoading = true;
  isSaving = false;
  currencies: any[] = [];

  constructor(
    private dialogRef: MatDialogRef<ForexConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private forexService: ForexService,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.currencies = data.currencies || [];
    this.configForm = this.fb.group({
      mappings: this.fb.array([])
    });
  }

  get mappings(): FormArray {
    return this.configForm.get('mappings') as FormArray;
  }

  ngOnInit(): void {
    this.forexService.getGlAccounts().subscribe({
      next: (accounts) => {
        this.glAccounts = accounts;
        this.loadExistingConfiguration();
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Erreur lors du chargement des comptes GL', 'Fermer', { duration: 3000 });
      }
    });
  }

  loadExistingConfiguration() {
    this.http.get<any[]>('/datatables/forex_currency_mapping/1').subscribe({
      next: (rows) => {
        this.initializeForm(rows || []);
      },
      error: (err) => {
        if (err.status === 404) {
          this.initializeForm([]);
        } else {
          this.isLoading = false;
          this.snackBar.open('Erreur lors du chargement de la configuration', 'Fermer', { duration: 3000 });
        }
      }
    });
  }

  initializeForm(existingRows: any[]) {
    this.currencies.forEach(currency => {
      const existingRow = existingRows.find(r => r.currency_code === currency.code);
      this.mappings.push(this.fb.group({
        rowId: [existingRow ? existingRow.rowId : null],
        currency_code: [currency.code],
        currency_name: [currency.name],
        cash_gl_account_id: [existingRow ? existingRow.cash_gl_account_id : '', Validators.required],
        transit_gl_account_id: [existingRow ? existingRow.transit_gl_account_id : '', Validators.required],
        margin_gl_account_id: [existingRow ? existingRow.margin_gl_account_id : '', Validators.required]
      }));
    });
    this.isLoading = false;
  }

  save() {
    if (this.configForm.invalid) {
      this.snackBar.open('Veuillez remplir tous les champs obligatoires.', 'Fermer', { duration: 3000 });
      return;
    }
    
    this.isSaving = true;
    const values = this.configForm.value.mappings;
    let completed = 0;
    let hasError = false;

    if (values.length === 0) {
      this.dialogRef.close();
      return;
    }

    values.forEach((row: any) => {
      const payload = {
        currency_code: row.currency_code,
        cash_gl_account_id: row.cash_gl_account_id,
        transit_gl_account_id: row.transit_gl_account_id,
        margin_gl_account_id: row.margin_gl_account_id,
        locale: 'en',
        dateFormat: 'dd MMMM yyyy'
      };

      let request;
      if (row.rowId) {
        request = this.http.put(`/datatables/forex_currency_mapping/1/${row.rowId}`, payload);
      } else {
        request = this.http.post(`/datatables/forex_currency_mapping/1`, payload);
      }

      request.subscribe({
        next: () => {
          completed++;
          if (completed === values.length) {
            this.finalizeSave(hasError);
          }
        },
        error: (err) => {
          console.error(err);
          hasError = true;
          completed++;
          if (completed === values.length) {
            this.finalizeSave(hasError);
          }
        }
      });
    });
  }

  finalizeSave(hasError: boolean) {
    this.isSaving = false;
    if (hasError) {
      this.snackBar.open('Erreur lors de la sauvegarde de certaines devises.', 'Fermer', { duration: 5000 });
    } else {
      this.snackBar.open('Configuration sauvegardée avec succès.', 'Fermer', { duration: 3000, panelClass: 'success-snackbar' });
      this.dialogRef.close(true);
    }
  }

  close() {
    this.dialogRef.close();
  }
}
