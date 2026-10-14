/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';

/** rxjs Imports */
import { Observable, forkJoin } from 'rxjs';

/** Custom Services */
import { LoansService } from '../loans.service';

/**
 * Loans Transaction Reciept resolver.
 */
@Injectable()
export class LoansTransactionRecieptResolver {
  private loansService = inject(LoansService);

  /**
   * Returns the Loans Transaction Reciept
   * @param {ActivatedRouteSnapshot} route Route Snapshot
   * @returns {Observable<any>}
   */
  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    const transactionId = route.paramMap.get('id');
    const loanId = route.parent.paramMap.get('loanId');
    
    return forkJoin({
      transaction: this.loansService.getLoansAccountTransaction(loanId, transactionId),
      account: this.loansService.getLoanAccountDetails(loanId)
    });
  }
}
