import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';

export interface BankConfiguration {
  bankName: string;
  slogan: string;
  primaryColor: string;
  logoBase64: string | null;
  bp: string;
  phone: string;
  rc: string;
  email: string;
  paperSize: string;
}

const DEFAULT_CONFIG: BankConfiguration = {
  bankName: 'United Credit',
  slogan: 'Head Office',
  primaryColor: '#1074b9',
  logoBase64: null,
  bp: '',
  phone: '',
  rc: '',
  email: '',
  paperSize: 'A4'
};

@Injectable({
  providedIn: 'root'
})
export class BankConfigurationService {
  private http = inject(HttpClient);
  
  private configSubject = new BehaviorSubject<BankConfiguration>(DEFAULT_CONFIG);
  public config$: Observable<BankConfiguration> = this.configSubject.asObservable();
  
  private isConfigLoaded = false;
  // Track if a datatable entry exists per office ID
  private hasExistingDatatableEntryMap = new Map<number, boolean>();

  constructor() {
    // Optionally load for Head Office on init
  }

  /**
   * For backward compatibility in some components, though receipts will use getConfigForOffice
   */
  public get config(): BankConfiguration {
    return this.configSubject.value;
  }

  /**
   * Load configuration dynamically for a specific office.
   * If not found, falls back to office ID 1 (Head Office).
   */
  public getConfigForOffice(officeId: number): Observable<BankConfiguration> {
    const fallbackOfficeId = 1;
    return this.http.get<any[]>(`/datatables/bank_configuration/${officeId}`).pipe(
      map(res => {
        if (res && res.length > 0) {
          this.hasExistingDatatableEntryMap.set(officeId, true);
          return this.mapToBankConfiguration(res[0]);
        }
        throw new Error('No configuration found');
      }),
      catchError((err) => {
        this.hasExistingDatatableEntryMap.set(officeId, false);
        // Fallback to Head Office if officeId is not 1
        if (officeId !== fallbackOfficeId) {
          console.warn(`No config found for office ${officeId}, falling back to Head Office.`);
          return this.getConfigForOffice(fallbackOfficeId);
        }
        // If even Head Office fails, return DEFAULT
        console.error('No custom bank configuration found, returning default structure...');
        if (err.status === 404 || err.status === 403) {
          this.createDatatableStructure(); // Attempt to create structure if missing
        }
        return of(DEFAULT_CONFIG);
      })
    );
  }

  public updateConfiguration(config: BankConfiguration, officeId: number = 1): Observable<BankConfiguration> {
    const payload = {
      bankName: config.bankName,
      slogan: config.slogan,
      primaryColor: config.primaryColor,
      logoBase64: config.logoBase64,
      bp: config.bp,
      phone: config.phone,
      rc: config.rc,
      email: config.email,
      paperSize: config.paperSize
    };

    const url = `/datatables/bank_configuration/${officeId}`;
    const hasExisting = this.hasExistingDatatableEntryMap.get(officeId) || false;
    
    // If we know it exists, use PUT, otherwise POST.
    const request = hasExisting 
      ? this.http.put(url, payload) 
      : this.http.post(url, payload);

    return new Observable<BankConfiguration>((observer) => {
      request.subscribe({
        next: () => {
          this.hasExistingDatatableEntryMap.set(officeId, true);
          // If updating Head Office, also update global subject
          if (officeId === 1) {
            this.configSubject.next(config);
          }
          observer.next(config);
          observer.complete();
        },
        error: (err) => {
          // If POST failed because it exists, try PUT
          if (!hasExisting && err.status === 403) {
            this.http.put(url, payload).subscribe({
              next: () => {
                this.hasExistingDatatableEntryMap.set(officeId, true);
                if (officeId === 1) {
                  this.configSubject.next(config);
                }
                observer.next(config);
                observer.complete();
              },
              error: (putErr) => observer.error(putErr)
            });
          } else {
            observer.error(err);
          }
        }
      });
    });
  }

  private mapToBankConfiguration(data: any): BankConfiguration {
    return {
      bankName: data.bankName || DEFAULT_CONFIG.bankName,
      slogan: data.slogan || DEFAULT_CONFIG.slogan,
      primaryColor: data.primaryColor || DEFAULT_CONFIG.primaryColor,
      logoBase64: data.logoBase64 || null,
      bp: data.bp || '',
      phone: data.phone || '',
      rc: data.rc || '',
      email: data.email || '',
      paperSize: data.paperSize || DEFAULT_CONFIG.paperSize
    };
  }

  private loadFromBackend(): void {
    // Keep this for components that just want to listen to the global config (Head Office)
    this.getConfigForOffice(1).subscribe(config => {
      this.configSubject.next(config);
    });
  }

  private createDatatableStructure(): void {
    const payload = {
      apptableName: 'm_office',
      datatableName: 'bank_configuration',
      multiRow: false,
      columns: [
        { name: 'bankName', type: 'String', length: 150, mandatory: false },
        { name: 'slogan', type: 'String', length: 150, mandatory: false },
        { name: 'primaryColor', type: 'String', length: 20, mandatory: false },
        { name: 'logoBase64', type: 'Text', mandatory: false },
        { name: 'bp', type: 'String', length: 50, mandatory: false },
        { name: 'phone', type: 'String', length: 50, mandatory: false },
        { name: 'rc', type: 'String', length: 50, mandatory: false },
        { name: 'email', type: 'String', length: 100, mandatory: false },
        { name: 'paperSize', type: 'String', length: 10, mandatory: false }
      ]
    };

    // Use HttpClient directly
    this.http.post('/datatables', payload).subscribe({
      next: () => {
        console.log('Successfully created bank_configuration datatable structure!');
        // Save the default config as the initial row for Office 1
        this.updateConfiguration(DEFAULT_CONFIG, 1).subscribe();
      },
      error: (err) => {
        console.error('Failed to create datatable structure. Please create it manually.', err);
      }
    });
  }
}
