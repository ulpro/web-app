/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { Currency } from 'app/shared/models/general.model';
import { BankConfigurationService, BankConfiguration } from 'app/system/bank-configuration/bank-configuration.service';
import { Observable } from 'rxjs';
import { AmountInWordsFrPipe } from 'app/pipes/amount-in-words-fr.pipe';
import { ClientsService } from 'app/clients/clients.service';

/**
 * View Transaction Reciept Component
 */
@Component({
  selector: 'mifosx-view-reciept',
  templateUrl: './view-reciept.component.html',
  styleUrls: ['./view-reciept.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    AmountInWordsFrPipe
  ]
})
export class ViewRecieptComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthenticationService);
  private bankConfigService = inject(BankConfigurationService);
  private clientsService = inject(ClientsService);

  /** Transaction Reciept Data */
  transaction: any;
  account: any;
  
  tellerName = '';
  officeName = '';
  clientOfficeName = '';
  transactionDate = '';
  transactionTime = '';
  currency: Currency | null = null;
  balanceBefore = 0;
  balanceAfter = 0;
  isDeposit = false;
  paymentTypeName = '';

  bankConfig$!: Observable<BankConfiguration>;

  private cdr = inject(ChangeDetectorRef);

  /**
   * Fetches transaction reciept `resolve`
   */
  constructor() {
    this.route.data.subscribe((data: { savingsTransactionReciept: {transaction: any, account: any} }) => {
      this.transaction = data.savingsTransactionReciept.transaction;
      this.account = data.savingsTransactionReciept.account;
    });
  }

  ngOnInit() {
    const credentials = this.authService.getCredentials();
    this.tellerName = credentials?.staffDisplayName || credentials?.username || 'Guichetier';
    this.officeName = credentials?.officeName || 'United Credit';
    
    // Fallback if client service fails or while loading
    this.clientOfficeName = this.account?.timeline?.submittedOnOfficeName || this.account?.officeName || this.transaction?.officeName || this.officeName;
    
    // Load specific bank config based on the account's office ID, fallback to 1
    const receiptOfficeId = this.account?.officeId || this.transaction?.officeId || 1;
    this.bankConfig$ = this.bankConfigService.getConfigForOffice(receiptOfficeId);
    
    // Fetch precise client office name if clientId exists
    if (this.account?.clientId) {
      this.clientsService.getClientData(this.account.clientId).subscribe((clientData: any) => {
        if (clientData?.officeName) {
          this.clientOfficeName = clientData.officeName;
          this.cdr.detectChanges();
        }
      });
    }

    this.currency = this.account?.currency;
    
    const txnDateObj = this.transaction?.date ? new Date(this.transaction.date) : new Date();
    this.transactionDate = txnDateObj.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    this.transactionTime = txnDateObj.toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit'
    });
    
    this.isDeposit = this.transaction?.transactionType?.deposit;
    this.balanceAfter = this.transaction?.runningBalance || 0;
    this.balanceBefore = this.isDeposit 
      ? this.balanceAfter - this.transaction?.amount
      : this.balanceAfter + this.transaction?.amount;
      
    this.paymentTypeName = this.transaction?.paymentDetailData?.paymentType?.name || 'Cash';
  }

  printReceipt() {
    window.print();
  }
}
