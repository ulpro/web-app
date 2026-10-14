import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { ForexService } from './forex.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { concatMap, catchError } from 'rxjs/operators';
import { of, from, throwError } from 'rxjs';

@Component({
  selector: 'app-forex',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatTableModule
  ],
  templateUrl: './forex.component.html',
  styleUrls: ['./forex.component.scss']
})
export class ForexComponent implements OnInit {
  forexForm: FormGroup;
  currencies: any[] = [];
  glAccounts: any[] = [];
  clients: any[] = [];
  savingsAccounts: any[] = [];
  savingsProducts: any[] = [];
  forexMappings: any[] = [];
  isSubmitting = false;

  historyData: any[] = [];
  displayedHistoryColumns: string[] = ['transaction_date', 'source_currency', 'source_amount', 'target_currency', 'target_amount', 'exchange_rate'];

  constructor(
    private fb: FormBuilder,
    private forexService: ForexService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {
    this.forexForm = this.fb.group({
      sourceCurrency: ['', Validators.required],
      targetCurrency: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      exchangeRate: ['', [Validators.required, Validators.min(0.0001)]],
      commission: [0, [Validators.min(0)]],
      calculatedAmount: [{value: '', disabled: true}],
      operationType: ['CASH_TO_ACCOUNT', Validators.required],
      clientId: [''],
      clientNameSearch: [''],
      officeId: [1, Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadCurrencies();
    this.loadGlAccounts();
    this.loadForexMappings();
    this.loadSavingsProducts();
    this.setupFormListeners();

    // Vérifier si le composant est utilisé dans le contexte d'un client (ex: onglet Change Devise)
    const clientIdParam = this.route.parent?.snapshot.paramMap.get('clientId') || this.route.snapshot.paramMap.get('clientId');
    if (clientIdParam) {
      const clientId = Number(clientIdParam);
      this.forexForm.get('clientId')?.setValue(clientId);
      this.forexForm.get('clientNameSearch')?.disable();
      
      // Essayer de charger les infos du client pour l'affichage (optionnel, mais utile)
      this.loadClientAccounts(clientId);
      this.loadHistory(clientId);
    }
  }

  loadHistory(clientId: number) {
    this.forexService.getForexHistory(1).subscribe({
      next: (res: any) => {
        if (res && res.data) {
          // Filter history for this client. Column 1 is client_id in genericResultSet
          const headers = res.columnHeaders.map((c: any) => c.columnName);
          const clientIdIndex = headers.indexOf('client_id');
          
          this.historyData = res.data
            .filter((row: any) => row.row[clientIdIndex] === clientId)
            .map((row: any) => {
              const item: any = {};
              headers.forEach((h: string, i: number) => {
                item[h] = row.row[i];
              });
              // transaction_date comes as array [YYYY, MM, DD] from Fineract API
              if (Array.isArray(item.transaction_date)) {
                item.transaction_date = new Date(item.transaction_date[0], item.transaction_date[1] - 1, item.transaction_date[2]);
              }
              return item;
            });
        }
      },
      error: () => {
        console.warn('Could not load forex history. Datatable might be empty.');
      }
    });
  }

  loadCurrencies() {
    this.forexService.getCurrencies().subscribe(res => {
      this.currencies = res.selectedCurrencyOptions || [];
    });
  }

  loadGlAccounts() {
    this.forexService.getGlAccounts().subscribe(res => {
      this.glAccounts = res || [];
    });
  }

  loadForexMappings() {
    this.forexService.getForexCurrencyMapping(1).subscribe(res => {
      this.forexMappings = res || [];
    });
  }

  loadSavingsProducts() {
    this.forexService.getSavingsProducts().subscribe(res => {
      this.savingsProducts = res || [];
    });
  }

  setupFormListeners() {
    this.forexForm.valueChanges.subscribe(val => {
      if (val.amount && val.exchangeRate) {
        const calculated = val.amount * val.exchangeRate;
        this.forexForm.get('calculatedAmount')?.setValue(calculated.toFixed(2), { emitEvent: false });
      }
    });
  }

  searchClient() {
    const query = this.forexForm.get('clientNameSearch')?.value;
    if (query && query.length > 2) {
      this.forexService.searchClients(query).subscribe(res => {
        this.clients = res.pageItems || [];
      });
    }
  }

  selectClient(client: any) {
    this.forexForm.get('clientId')?.setValue(client.id);
    this.forexForm.get('clientNameSearch')?.setValue(client.displayName);
    this.loadClientAccounts(client.id);
  }

  loadClientAccounts(clientId: number) {
    this.forexService.getClientAccounts(clientId).subscribe(res => {
      const targetCurrency = this.forexForm.get('targetCurrency')?.value;
      if (res.savingsAccounts) {
        this.savingsAccounts = res.savingsAccounts.filter((acc: any) => 
          acc.currency.code === targetCurrency && acc.status.id === 300 // Active
        );
      }
    });
  }

  executeOperation() {
    if (this.forexForm.invalid) {
      this.snackBar.open('Veuillez remplir tous les champs obligatoires.', 'Fermer', { duration: 3000 });
      return;
    }
    
    this.isSubmitting = true;
    const val = this.forexForm.getRawValue();
    const today = new Date();
    const formattedDate = this.forexService['datePipe'].transform(today, 'dd MMMM yyyy'); // Hack to format date here

    // Find Target Currency Mapping
    const targetMap = this.forexMappings.find(m => m.currency_code === val.targetCurrency);
    const sourceMap = this.forexMappings.find(m => m.currency_code === val.sourceCurrency);

    if (!targetMap || !sourceMap) {
      this.snackBar.open('Configuration Forex manquante pour ces devises.', 'Fermer', { duration: 5000 });
      this.isSubmitting = false;
      return;
    }

    // Identify target product
    const productCodeMap: any = { 'XAF': 'FXAF', 'EUR': 'FEUR', 'USD': 'FUSD' };
    const targetProductCode = productCodeMap[val.targetCurrency];
    const targetProduct = this.savingsProducts.find(p => p.shortName === targetProductCode);

    if (!targetProduct) {
      this.snackBar.open('Produit Portefeuille FX introuvable pour la devise cible.', 'Fermer', { duration: 5000 });
      this.isSubmitting = false;
      return;
    }

    // Check if client has this account
    const existingAccount = this.savingsAccounts.find(a => a.productId === targetProduct.id);
    let targetAccountId = existingAccount?.id;
    let isActive = existingAccount?.status?.active || false;

    if (!targetAccountId) {
      // Step 1: Create Account
      this.snackBar.open('Création du Portefeuille FX en cours...', '', { duration: 2000 });
      this.forexService.createSavingsAccount(val.clientId, targetProduct.id, today).subscribe({
        next: (createRes) => {
          targetAccountId = createRes.savingsId || createRes.resourceId;
          this.forexService.approveAndActivateSavingsAccount(targetAccountId, today).subscribe({
            next: () => {
              this.executeSequentialOperations(val, targetAccountId, targetMap, sourceMap);
            },
            error: (err) => {
              this.isSubmitting = false;
              this.snackBar.open('Erreur lors de l\'activation du compte: ' + (err.error?.developerMessage || err.message), 'Fermer', { duration: 5000 });
            }
          });
        },
        error: (err) => {
          this.isSubmitting = false;
          this.snackBar.open('Erreur création compte: ' + (err.error?.developerMessage || err.message), 'Fermer', { duration: 5000 });
        }
      });
    } else if (!isActive) {
      // Account exists but is not active (leftover from previous error)
      this.snackBar.open('Activation du Portefeuille FX existant...', '', { duration: 2000 });
      this.forexService.activateSavingsAccount(targetAccountId, today).subscribe({
        next: () => {
          this.executeSequentialOperations(val, targetAccountId, targetMap, sourceMap);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.snackBar.open('Erreur activation: ' + (err.error?.developerMessage || err.message), 'Fermer', { duration: 5000 });
        }
      });
    } else {
      // Step 2: Execute Sequential Operations
      this.executeSequentialOperations(val, targetAccountId, targetMap, sourceMap);
    }
  }

  private executeSequentialOperations(val: any, targetAccountId: number, targetMap: any, sourceMap: any) {
    this.snackBar.open('Exécution de la transaction...', '', { duration: 2000 });

    const amountSource = parseFloat(val.amount);
    const amountTarget = parseFloat(val.calculatedAmount);
    const commissionAmt = parseFloat(val.commission) || 0;
    const today = new Date();
    
    // Saga Pattern: Keep track of successful transactions to rollback if needed
    const executedTransactions: string[] = [];

    // 1. Journal Entry Target (Transit vs Cash)
    this.forexService.createJournalEntry(
      val.officeId,
      today,
      val.targetCurrency,
      amountTarget,
      targetMap.transit_gl_account_id, // Debit Target Transit
      targetMap.cash_gl_account_id,    // Credit Target Cash
      'Forex Target Regularization'
    ).pipe(
      concatMap((res: any) => {
        if (res && res.transactionId) executedTransactions.push(res.transactionId);
        
        // 2. Journal Entry Source (Cash vs Transit)
        return this.forexService.createJournalEntry(
          val.officeId,
          today,
          val.sourceCurrency,
          amountSource,
          sourceMap.cash_gl_account_id,    // Debit Source Cash
          sourceMap.transit_gl_account_id, // Credit Source Transit
          'Forex Source Regularization'
        );
      }),
      concatMap((res: any) => {
        if (res && res.transactionId) executedTransactions.push(res.transactionId);
        
        // 3. Journal Entry Commission (If applicable)
        if (commissionAmt > 0 && sourceMap.margin_gl_account_id) {
          return this.forexService.createJournalEntry(
            val.officeId,
            today,
            val.sourceCurrency,
            commissionAmt,
            sourceMap.cash_gl_account_id,    // Debit Source Cash (Paid by client)
            sourceMap.margin_gl_account_id,  // Credit Source Margin (Income)
            'Forex Commission'
          );
        }
        return of(null);
      }),
      concatMap((res: any) => {
        if (res && res.transactionId) executedTransactions.push(res.transactionId);
        
        // 4. Deposit to Savings Account (Portfolio)
        return this.forexService.depositToSavingsAccount(targetAccountId, amountTarget, today, val.targetCurrency);
      }),
      concatMap((depositRes: any) => {
        // 5. Save to History Datatable
        const historyPayload = {
          client_id: val.clientId,
          transaction_date: this.forexService['datePipe'].transform(today, 'dd MMMM yyyy'),
          source_currency: val.sourceCurrency,
          source_amount: amountSource,
          target_currency: val.targetCurrency,
          target_amount: amountTarget,
          exchange_rate: parseFloat(val.exchangeRate)
        };
        // Optionnel: loguer la commission dans l'historique si on ajoute la colonne plus tard
        return this.forexService.addForexHistory(val.officeId, historyPayload);
      }),
      catchError((err: any) => {
        console.error('Transaction failed, initiating rollback (Saga)...', err);
        // Rollback: reverse all successfully created journal entries in reverse order
        if (executedTransactions.length > 0) {
          // Utilisons rxjs from pour exécuter les reverse séquentiellement
          return from(executedTransactions.reverse()).pipe(
            concatMap((txId: string) => this.forexService.reverseJournalEntry(txId).pipe(
              catchError((reverseErr: any) => {
                console.error(`CRITICAL: Failed to reverse transaction ${txId}`, reverseErr);
                return of(null); // Continue attempting to reverse others
              })
            )),
            // Re-throw l'erreur originelle pour afficher le message approprié
            concatMap(() => throwError(() => err))
          );
        }
        return throwError(() => err);
      })
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.snackBar.open('Opération de change réussie et comptabilisée !', 'Fermer', { duration: 5000, panelClass: ['success-snackbar'] });
        this.forexForm.reset({ officeId: 1, operationType: 'CASH_TO_ACCOUNT', clientId: val.clientId, commission: 0 });
        this.loadHistory(val.clientId); // Reload history
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err.error?.developerMessage || err.error?.defaultUserMessage || err.message || 'Erreur inconnue';
        this.snackBar.open(`Échec. Transaction annulée et écritures contre-passées. (${msg})`, 'Fermer', { duration: 8000 });
      }
    });
  }
}
