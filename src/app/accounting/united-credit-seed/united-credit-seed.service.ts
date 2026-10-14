import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, forkJoin } from 'rxjs';
import { concatMap, catchError, map, tap, delay } from 'rxjs/operators';
import { OrganizationService } from '../../organization/organization.service';

export interface SeedProgress {
  phase: string;
  total: number;
  current: number;
  success: number;
  error: number;
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UnitedCreditSeedService {
  private http = inject(HttpClient);
  private organizationService = inject(OrganizationService);

  // In-memory state to resolve dependencies (IDs)
  private state = {
    offices: {} as Record<string, number>,
    roles: {} as Record<string, number>,
    glAccounts: {} as Record<string, number>,
    tellers: {} as Record<string, number>,
    staff: {} as Record<string, { id: number, officeId: number }>, // updated
    savingsProducts: {} as Record<string, number>,
    loanProducts: {} as Record<string, number>,
    clients: {} as Record<string, number>
  };


  fetchExistingGLAccounts(): Observable<any> {
    return this.http.get('/glaccounts?fetchRunningBalance=false').pipe(
      tap((res: any) => {
        if (res && Array.isArray(res)) {
          res.forEach((gl: any) => {
            this.state.glAccounts[gl.glCode] = gl.id;
          });
        }
      })
    );
  }

  fetchExistingOffices(): Observable<any> {
    return this.http.get('/offices').pipe(
      tap((res: any) => {
        if (res && Array.isArray(res)) {
          res.forEach((office: any) => {
            if (office.name) {
              const codeMatch = office.name.match(/\((UC-[^)]+)\)/);
              if (codeMatch) {
                this.state.offices[codeMatch[1]] = office.id;
              } else {
                // If it doesn't have a code in parens, maybe it's Head Office
                if (office.name === 'Head Office' || office.name.includes('DG')) {
                  this.state.offices['UC-DG'] = office.id;
                }
              }
            }
          });
        }
      }),
      catchError(() => of([]))
    );
  }

  /**
   * 0. Currencies
   */
  runPhaseCurrencies(currencies: string[]): Observable<any> {
    return this.http.put('/currencies', { currencies }).pipe(
      catchError(err => of({ error: err }))
    );
  }

  /**
   * 1. Offices
   */
  runPhaseOffices(offices: any[]): Observable<any> {
    // Topologically sort: parent null first
    const ordered = [...offices].sort((a, b) => (a.parent === null ? -1 : 1));
    return from(ordered).pipe(
      concatMap(o => {
        if (this.state.offices[o.code]) {
          return of({ status: 'skipped', code: o.code });
        }
        const payload: any = {
          name: `${o.name} (${o.code})`,
          openingDate: '01 January 2020',
          dateFormat: 'dd MMMM yyyy',
          locale: 'en'
        };
        if (o.parent && this.state.offices[o.parent]) {
          payload.parentId = this.state.offices[o.parent];
        }
        return this.http.post('/offices', payload).pipe(
          tap((res: any) => {
            if (res && (res.resourceId || res.officeId)) {
              this.state.offices[o.code] = res.resourceId || res.officeId;
            }
          }),
          catchError(err => of({ error: err, item: o.code }))
        );
      })
    );
  }

  /**
   * 2. GL Accounts
   */
  runPhaseGLAccounts(glData: any): Observable<any> {
    const headers = glData.headers || [];
    const details = glData.details || [];
    const allGLs = [...headers, ...details];

    return from(allGLs).pipe(
      concatMap(gl => {
        if (this.state.glAccounts[gl.code]) {
          return of({ status: 'skipped', code: gl.code });
        }
        const isHeader = gl.usage === 'HEADER' || !gl.parent;
        const typeMapping: Record<string, number> = { ASSET: 1, LIABILITY: 2, EQUITY: 3, INCOME: 4, EXPENSE: 5 };
        
        const payload: any = {
          name: gl.name,
          glCode: gl.code,
          type: typeMapping[gl.type],
          usage: isHeader ? 2 : 1,
          manualEntriesAllowed: !isHeader,
          locale: 'en'
        };

        if (gl.parent && this.state.glAccounts[gl.parent]) {
          payload.parentId = this.state.glAccounts[gl.parent];
        }

        return this.http.post('/glaccounts', payload).pipe(
          tap((res: any) => {
            if (res && res.resourceId) {
              this.state.glAccounts[gl.code] = res.resourceId;
            }
          }),
          catchError(err => of({ error: err, item: gl.code }))
        );
      })
    );
  }

  /**
   * 2.0.1 Financial Activities (Inter-Branch / Transfer Mappings)
   */
  runPhaseFinancialActivities(): Observable<any> {
    const assetGlId = this.state.glAccounts['47100'] || this.state.glAccounts['47'] || this.state.glAccounts['57100'] || 1;
    const liabilityGlId = this.state.glAccounts['181'] || this.state.glAccounts['18'] || this.state.glAccounts['40100'] || 1;
    const cashGlId = this.state.glAccounts['57100'] || 1;
    const equityGlId = this.state.glAccounts['10100'] || 1;

    const activities = [
      { financialActivityId: 100, glAccountId: assetGlId, name: 'Asset Transfer' },
      { financialActivityId: 200, glAccountId: liabilityGlId, name: 'Liability Transfer' },
      { financialActivityId: 101, glAccountId: cashGlId, name: 'Cash at Main Vault' },
      { financialActivityId: 102, glAccountId: cashGlId, name: 'Cash at Teller' },
      { financialActivityId: 103, glAccountId: cashGlId, name: 'Fund Source' },
      { financialActivityId: 300, glAccountId: equityGlId, name: 'Opening Balances Contra' }
    ];

    return from(activities).pipe(
      concatMap(act => {
        return this.http.post('/financialactivityaccounts', {
          financialActivityId: act.financialActivityId,
          glAccountId: act.glAccountId
        }).pipe(
          catchError(() => of({ status: 'skipped', item: act.name }))
        );
      })
    );
  }

  /**
   * 2.1 Roles
   */
  runPhaseRoles(roles: any[]): Observable<any> {
    return from(roles).pipe(
      concatMap(r => {
        // First try to create the role
        const payload = {
          name: r.name,
          description: r.description
        };
        return this.http.post('/roles', payload).pipe(
          concatMap((res: any) => {
            const roleId = res.resourceId;
            this.state.roles = this.state.roles || {};
            this.state.roles[r.name] = roleId;
            
            // Then update its permissions
            return this.http.put(`/roles/${roleId}/permissions`, { permissions: r.permissions }).pipe(
              tap(() => { /* Permissions updated */ })
            );
          }),
          catchError((err: any) => {
            // If it already exists (403 Data integrity or similar), fetch it by name to get its ID
            return this.http.get('/roles').pipe(
              concatMap((rolesList: any) => {
                const existing = rolesList.find((x: any) => x.name === r.name);
                if (existing) {
                  this.state.roles = this.state.roles || {};
                  this.state.roles[r.name] = existing.id;
                  
                  // Update permissions even if it already exists
                  return this.http.put(`/roles/${existing.id}/permissions`, { permissions: r.permissions });
                }
                return of({ error: err, item: r.name });
              })
            );
          }),
          catchError(err => of({ error: err, item: r.name }))
        );
      })
    );
  }

  /**
   * 2.5 Staff
   */
  runPhaseStaff(staffs: any[]): Observable<any> {
    return from(staffs).pipe(
      concatMap(s => {
        const officeId = this.state.offices[s.officeCode];
        if (!officeId) return of({ error: `Office not found: ${s.officeCode || s.officeName}`, item: s.externalId });

        if (this.state.staff[s.externalId]) {
          return of({ status: 'skipped', code: s.externalId });
        }

        const payload = {
          officeId: officeId,
          firstname: s.firstname,
          lastname: s.lastname,
          isLoanOfficer: s.isLoanOfficer,
          mobileNo: s.mobileNo,
          joiningDate: s.joiningDate,
          dateFormat: s.dateFormat,
          locale: s.locale,
          externalId: s.externalId,
          isActive: s.isActive
        };

        return this.organizationService.createEmployee(payload).pipe(
          tap((res: any) => {
            if (res && res.resourceId) {
              this.state.staff[s.externalId] = { id: res.resourceId, officeId: officeId };
            }
          }),
          catchError((err: any) => {
            // Try to find if already exists
            return this.organizationService.getEmployees().pipe(
              concatMap((staffList: any) => {
                const existing = staffList.find((x: any) => x.externalId === s.externalId);
                if (existing) {
                  this.state.staff[s.externalId] = { id: existing.id, officeId: officeId };
                  return of({ status: 'skipped', code: s.externalId });
                }
                return of({ error: err, item: s.externalId });
              })
            );
          })
        );
      })
    );
  }

  /**
   * 2.6 Users
   */
  runPhaseUsers(users: any[]): Observable<any> {
    return from(users).pipe(
      concatMap(u => {
        const staffObj = this.state.staff[u.staffExternalId];
        const staffId = staffObj ? staffObj.id : null;
        if (!staffId) return of({ error: `Staff not found: ${u.staffExternalId}`, item: u.username });

        const roleId = this.state.roles ? this.state.roles[u.roleName] : null;
        if (!roleId) return of({ error: `Role not found: ${u.roleName}`, item: u.username });

        const payload = {
          username: u.username,
          firstname: u.firstname,
          lastname: u.lastname,
          email: u.email,
          officeId: u.roleName === 'demo.caissier.national' ? 1 : (staffObj ? staffObj.officeId : 1),
          staffId: staffId,
          roles: [roleId],
          sendPasswordToEmail: false,
          password: "Fineract2026!",
          repeatPassword: "Fineract2026!"
        };

        return this.http.post('/users', payload).pipe(
          catchError((err: any) => {
            return this.http.get('/users').pipe(
              concatMap((userList: any) => {
                const existing = userList.find((x: any) => x.username === u.username);
                if (existing) {
                  return of({ status: 'skipped', code: u.username });
                }
                return of({ error: err, item: u.username });
              })
            );
          })
        );
      })
    );
  }

  /**
   * 3. Tellers
   */
  runPhaseTellers(tellers: any[]): Observable<any> {
    return from(tellers).pipe(
      concatMap(t => {
        const officeId = this.state.offices[t.office];
        if (!officeId) return of({ error: 'Office not found', item: t.name });

        const payload = {
          officeId: officeId,
          name: t.name,
          description: `Caisse principale — ${t.office}`,
          startDate: '01 January 2020',
          status: 300,
          locale: 'en',
          dateFormat: 'dd MMMM yyyy'
        };

        return this.http.post('/tellers', payload).pipe(
          tap((res: any) => {
            if (res && res.resourceId) {
              this.state.tellers[t.name] = res.resourceId;
            }
          }),
          catchError((err: any) => {
            return this.http.get('/tellers').pipe(
              concatMap((list: any) => {
                const existing = list.find((x: any) => x.name === t.name);
                if (existing) {
                  this.state.tellers[t.name] = existing.id;
                  return of({ status: 'skipped', code: t.name });
                }
                return of({ error: err, item: t.name });
              })
            );
          })
        );
      })
    );
  }

  /**
   * 4. Savings Products
   */
  runPhaseSavingsProducts(products: any[]): Observable<any> {
    const refAccount = this.state.glAccounts['40100'] || 1;
    const suspenseAccount = this.state.glAccounts['47100'] || 1;
    const feeAccount = this.state.glAccounts['71600'] || 1;
    const penaltyAccount = this.state.glAccounts['70200'] || 1;
    const interestAccount = this.state.glAccounts['61100'] || 1;

    return from(products).pipe(
      concatMap(p => {
        const payload = {
          name: p.name,
          shortName: p.name.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase(),
          currencyCode: 'XAF',
          digitsAfterDecimal: 0,
          nominalAnnualInterestRate: p.rate_annual_pct,
          interestCompoundingPeriodType: 1,
          interestPostingPeriodType: 4,
          interestCalculationType: 1,
          interestCalculationDaysInYearType: 365,
          minRequiredOpeningBalance: p.min_balance_xaf,
          accountingRule: 2,
          savingsReferenceAccountId: this.state.glAccounts['57100'] || 1,
          savingsControlAccountId: refAccount,
          transfersInSuspenseAccountId: this.state.glAccounts['40100'] || 1,
          incomeFromFeeAccountId: feeAccount,
          incomeFromPenaltyAccountId: penaltyAccount,
          interestOnSavingsAccountId: interestAccount,
          incomeFromInterestId: this.state.glAccounts['71100'] || 1,
          overdraftPortfolioControlId: this.state.glAccounts['30100'] || 1,
          writeOffAccountId: this.state.glAccounts['65200'] || 1,
          locale: 'en'
        };

        return this.http.post('/savingsproducts', payload).pipe(
          tap((res: any) => {
            if (res && res.resourceId) {
              this.state.savingsProducts[p.name] = res.resourceId;
            }
          }),
          catchError((err: any) => {
            return this.http.get('/savingsproducts').pipe(
              concatMap((list: any) => {
                const existing = list.find((x: any) => x.name === p.name);
                if (existing) {
                  this.state.savingsProducts[p.name] = existing.id;
                  return of({ status: 'skipped', code: p.name });
                }
                return of({ error: err, item: p.name });
              })
            );
          })
        );
      })
    );
  }

  /**
   * 5. Loan Products
   */
  runPhaseLoanProducts(products: any[]): Observable<any> {
    const fundSource = this.state.glAccounts['52100'] || 1;
    const suspenseAccount = this.state.glAccounts['47100'] || 1;
    const feeAccount = this.state.glAccounts['71600'] || 1;
    const penaltyAccount = this.state.glAccounts['70200'] || 1;
    const writeoffAccount = this.state.glAccounts['65200'] || 1;

    return from(products).pipe(
      concatMap(p => {
        const portfolioAccount = this.state.glAccounts[p.gl_account] || 1;
        const interestAccountCode = (p.duration_months_max <= 12 && ['30100', '30200'].includes(p.gl_account)) ? '71100' : '71200';
        const interestAccount = this.state.glAccounts[interestAccountCode] || 1;

        const payload = {
          name: p.name,
          shortName: p.name.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase(),
          currencyCode: 'XAF',
          digitsAfterDecimal: 0,
          principal: p.min_xaf,
          minPrincipal: p.min_xaf,
          maxPrincipal: p.max_xaf,
          numberOfRepayments: p.duration_months_max,
          minNumberOfRepayments: p.duration_months_min,
          maxNumberOfRepayments: p.duration_months_max,
          repaymentEvery: 1,
          repaymentFrequencyType: 2,
          interestRatePerPeriod: p.rate_annual_pct,
          interestRateFrequencyType: 2,
          interestCalculationPeriodType: 1,
          daysInYearType: 1,
          daysInMonthType: 1,
          amortizationType: 1,
          interestType: 0,
          isInterestRecalculationEnabled: false,
          transactionProcessingStrategyCode: 'mifos-standard-strategy',
          accountingRule: 2,
          fundSourceAccountId: fundSource,
          loanPortfolioAccountId: portfolioAccount,
          interestOnLoanAccountId: interestAccount,
          incomeFromFeeAccountId: feeAccount,
          incomeFromPenaltyAccountId: penaltyAccount,
          incomeFromRecoveryAccountId: this.state.glAccounts['75100'] || 1,
          transfersInSuspenseAccountId: suspenseAccount,
          writeOffAccountId: writeoffAccount,
          overpaymentLiabilityAccountId: this.state.glAccounts['40100'] || 1,
          locale: 'en'
        };

        return this.http.post('/loanproducts', payload).pipe(
          tap((res: any) => {
            if (res && res.resourceId) {
              this.state.loanProducts[p.name] = res.resourceId;
            }
          }),
          catchError((err: any) => {
            return this.http.get('/loanproducts').pipe(
              concatMap((list: any) => {
                const existing = list.find((x: any) => x.name === p.name);
                if (existing) {
                  this.state.loanProducts[p.name] = existing.id;
                  return of({ status: 'skipped', code: p.name });
                }
                return of({ error: err, item: p.name });
              })
            );
          })
        );
      })
    );
  }

  /**
   * 6. Clients
   */
  runPhaseClients(clients: any[]): Observable<any> {
    return from(clients).pipe(
      concatMap(c => {
        const officeId = this.state.offices[c.office];
        if (!officeId) return of({ error: 'Office not found', item: c.id });

        const isEntity = c.type === 'Entreprise' || c.type === 'Groupe solidaire';
        const payload: any = {
          officeId: officeId,
          legalFormId: isEntity ? 2 : 1,
          active: c.kyc_status === 'CONFORME',
          activationDate: '01 January 2020',
          dateFormat: 'dd MMMM yyyy',
          locale: 'en',
          externalId: c.id
        };

        if (isEntity) {
          payload.fullname = c.name;
        } else {
          const parts = c.name.split(' ');
          payload.lastname = parts[0];
          payload.firstname = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
        }

        return this.http.post('/clients', payload).pipe(
          tap((res: any) => {
            if (res && (res.clientId || res.resourceId)) {
              this.state.clients[c.id] = res.clientId || res.resourceId;
            }
          }),
          catchError((err: any) => {
            return of({ status: 'skipped', code: c.id });
          })
        );
      })
    );
  }

  runPhaseForex(forexConfig: any = {}): Observable<any> {
    const products = forexConfig.products || [
      { name: 'Portefeuille FX XAF', code: 'FXAF', currency: 'XAF' },
      { name: 'Portefeuille FX EUR', code: 'FEUR', currency: 'EUR' },
      { name: 'Portefeuille FX USD', code: 'FUSD', currency: 'USD' }
    ];

    const refAccount = this.state.glAccounts[forexConfig.transit_gl_account || '47100'] || 1;
    const feeAccount = this.state.glAccounts[forexConfig.margin_gl_account || '71600'] || 1;
    const interestAccount = this.state.glAccounts[forexConfig.interest_gl_account || '61100'] || 1;
    const cashAccount = this.state.glAccounts[forexConfig.cash_gl_account || '57100'] || 1;

    // 1. Create FX Products
    return from(products).pipe(
      concatMap((p: any) => {
        const payload = {
          name: p.name,
          shortName: p.code,
          currencyCode: p.currency,
          digitsAfterDecimal: 0,
          nominalAnnualInterestRate: 0,
          interestCompoundingPeriodType: 1,
          interestPostingPeriodType: 4,
          interestCalculationType: 1,
          interestCalculationDaysInYearType: 365,
          minRequiredOpeningBalance: 0,
          accountingRule: 2,
          savingsReferenceAccountId: refAccount,
          savingsControlAccountId: refAccount,
          transfersInSuspenseAccountId: refAccount,
          incomeFromFeeAccountId: feeAccount,
          incomeFromPenaltyAccountId: feeAccount,
          interestOnSavingsAccountId: interestAccount,
          incomeFromInterestId: feeAccount,
          overdraftPortfolioControlId: refAccount,
          writeOffAccountId: refAccount,
          locale: 'en'
        };

        return this.http.post('/savingsproducts', payload).pipe(
          tap((res: any) => {
            if (res && res.resourceId) {
              this.state.savingsProducts[p.name] = res.resourceId;
            }
          }),
          catchError((err: any) => {
            return this.http.get('/savingsproducts').pipe(
              concatMap((list: any) => {
                const existing = list.find((x: any) => x.name === p.name);
                if (existing) {
                  this.state.savingsProducts[p.name] = existing.id;
                  return of({ status: 'skipped', code: p.name });
                }
                return of({ error: err, item: p.name });
              })
            );
          })
        );
      }),
      // After products, handle Datatable
      concatMap(() => {
        const dtPayload = {
          datatableName: "forex_currency_mapping",
          apptableName: "m_office",
          multiRow: true,
          columns: [
            { name: "currency_code", type: "String", length: 10 },
            { name: "cash_gl_account_id", type: "Number" },
            { name: "transit_gl_account_id", type: "Number" },
            { name: "margin_gl_account_id", type: "Number" }
          ]
        };
        return this.http.post('/datatables', dtPayload).pipe(
          catchError(() => of({ status: 'skipped', item: 'datatable' }))
        );
      }),
      // Handle History Datatable
      concatMap(() => {
        const historyDtPayload = {
          datatableName: "forex_history",
          apptableName: "m_office",
          multiRow: true,
          columns: [
            { name: "client_id", type: "Number" },
            { name: "transaction_date", type: "Date" },
            { name: "source_currency", type: "String", length: 10 },
            { name: "source_amount", type: "Decimal" },
            { name: "target_currency", type: "String", length: 10 },
            { name: "target_amount", type: "Decimal" },
            { name: "exchange_rate", type: "Decimal" }
          ]
        };
        return this.http.post('/datatables', historyDtPayload).pipe(
          catchError(() => of({ status: 'skipped', item: 'history_datatable' }))
        );
      }),
      // Finally, default mappings for Office 1
      concatMap(() => {
        const entries = products.map((p: any) => ({
          currency_code: p.currency, 
          cash_gl_account_id: cashAccount, 
          transit_gl_account_id: refAccount, 
          margin_gl_account_id: feeAccount, 
          locale: 'en', 
          dateFormat: 'dd MMMM yyyy'
        }));
        return from(entries).pipe(
          concatMap((entry: any) => {
            return this.http.post('/datatables/forex_currency_mapping/1', entry).pipe(
              catchError(() => of({ status: 'skipped', item: entry.currency_code }))
            );
          })
        );
      })
    );
  }
}
