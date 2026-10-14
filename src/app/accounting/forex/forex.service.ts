import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, concatMap } from 'rxjs';
import { DatePipe } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ForexService {

  constructor(private http: HttpClient, private datePipe: DatePipe) { }

  getCurrencies(): Observable<any> {
    return this.http.get('/currencies');
  }

  getGlAccounts(): Observable<any> {
    return this.http.get('/glaccounts?disabled=false&manualEntriesAllowed=true');
  }

  searchClients(query: string): Observable<any> {
    return this.http.get(`/clients?displayName=${query}&offset=0&limit=10`);
  }

  getClientAccounts(clientId: number): Observable<any> {
    return this.http.get(`/clients/${clientId}/accounts`);
  }

  depositToSavingsAccount(accountId: number, amount: number, date: Date, currencyCode: string): Observable<any> {
    const formattedDate = this.datePipe.transform(date, 'dd MMMM yyyy');
    const payload = {
      dateFormat: 'dd MMMM yyyy',
      locale: 'en',
      transactionDate: formattedDate,
      transactionAmount: amount,
      paymentTypeId: 1 // Cash by default
    };
    return this.http.post(`/savingsaccounts/${accountId}/transactions?command=deposit`, payload);
  }

  createJournalEntry(
    officeId: number, 
    date: Date, 
    currencyCode: string, 
    amount: number, 
    debitAccountId: number, 
    creditAccountId: number, 
    comments: string
  ): Observable<any> {
    const formattedDate = this.datePipe.transform(date, 'dd MMMM yyyy');
    const payload = {
      officeId: officeId,
      transactionDate: formattedDate,
      currencyCode: currencyCode,
      locale: 'en',
      dateFormat: 'dd MMMM yyyy',
      referenceNumber: 'FX-' + new Date().getTime(),
      comments: comments,
      credits: [{ glAccountId: creditAccountId, amount: amount }],
      debits: [{ glAccountId: debitAccountId, amount: amount }]
    };
    return this.http.post('/journalentries', payload);
  }

  reverseJournalEntry(transactionId: string): Observable<any> {
    return this.http.post(`/journalentries/${transactionId}?command=reverse`, {});
  }

  getForexCurrencyMapping(officeId: number = 1): Observable<any> {
    return this.http.get(`/datatables/forex_currency_mapping/${officeId}`);
  }

  getSavingsProducts(): Observable<any> {
    return this.http.get('/savingsproducts');
  }

  createSavingsAccount(clientId: number, productId: number, date: Date): Observable<any> {
    const formattedDate = this.datePipe.transform(date, 'dd MMMM yyyy');
    const payload = {
      clientId: clientId,
      productId: productId,
      locale: 'en',
      dateFormat: 'dd MMMM yyyy',
      submittedOnDate: formattedDate
    };
    // Note: If Fineract requires approval/activation, it might need to be submitted and activated in one go, 
    // but typically we can just submit and then activate. Fineract often allows passing "submittedOnDate", 
    // but requires an "approve" and "activate" command. We will just use the standard flow.
    return this.http.post('/savingsaccounts', payload);
  }
  
  approveAndActivateSavingsAccount(accountId: number, date: Date): Observable<any> {
    const formattedDate = this.datePipe.transform(date, 'dd MMMM yyyy');
    const approvePayload = {
      locale: 'en',
      dateFormat: 'dd MMMM yyyy',
      approvedOnDate: formattedDate
    };
    return this.http.post(`/savingsaccounts/${accountId}?command=approve`, approvePayload).pipe(
      concatMap(() => this.activateSavingsAccount(accountId, date))
    );
  }

  activateSavingsAccount(accountId: number, date: Date): Observable<any> {
    const formattedDate = this.datePipe.transform(date, 'dd MMMM yyyy');
    const activatePayload = {
      locale: 'en',
      dateFormat: 'dd MMMM yyyy',
      activatedOnDate: formattedDate
    };
    return this.http.post(`/savingsaccounts/${accountId}?command=activate`, activatePayload);
  }

  executeBatch(requests: any[]): Observable<any> {
    return this.http.post('/batches?enclosingTransaction=true', requests);
  }

  addForexHistory(officeId: number, data: any): Observable<any> {
    const payload = {
      ...data,
      locale: 'en',
      dateFormat: 'dd MMMM yyyy'
    };
    return this.http.post(`/datatables/forex_history/${officeId}`, payload);
  }

  getForexHistory(officeId: number): Observable<any> {
    return this.http.get(`/datatables/forex_history/${officeId}?genericResultSet=true`);
  }
}
