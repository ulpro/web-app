/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  KycDocumentType,
  KycTier,
  KycDocument,
  KycDocumentCreateRequest,
  KycDocumentActionType
} from '../models/kyc.model';

/**
 * Service gérant les communications avec l'API KYC d'Apache Fineract.
 *
 * L'authentification et le multi-tenant sont automatiquement gérés
 * par les intercepteurs HTTP Angular globaux (ex: TokenInterceptor, TenantInterceptor).
 */
@Injectable({
  providedIn: 'root'
})
export class KycService {
  private http = inject(HttpClient);

  private handleError(error: HttpErrorResponse) {
    console.error('Erreur API KYC Fineract:', error);
    return throwError(() => error);
  }

  // -------------------------------------------------------------------------
  // Administration : Types de documents
  // POST body: { code, name, description?, active? }
  // -------------------------------------------------------------------------

  getDocumentTypes(): Observable<KycDocumentType[]> {
    return this.http.get<KycDocumentType[]>('/v1/kyc/document-types')
      .pipe(catchError(this.handleError.bind(this)));
  }

  createDocumentType(documentType: KycDocumentType): Observable<any> {
    return this.http.post('/v1/kyc/document-types', documentType)
      .pipe(catchError(this.handleError.bind(this)));
  }

  // -------------------------------------------------------------------------
  // Administration : Niveaux KYC (Tiers)
  // POST body: { code, name, description?, level, maxBalance?, maxTransactionAmount?, active?, documentRequirements?: [{documentTypeId, mandatory?}] }
  // PUT body: { name?, description?, level?, maxBalance?, maxTransactionAmount?, active?, documentRequirements?: [{documentTypeId, mandatory?}] }
  // -------------------------------------------------------------------------

  getTiers(): Observable<KycTier[]> {
    return this.http.get<KycTier[]>('/v1/kyc/tiers')
      .pipe(catchError(this.handleError.bind(this)));
  }

  getTier(tierId: number | string): Observable<KycTier> {
    return this.http.get<KycTier>(`/v1/kyc/tiers/${tierId}`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  createTier(tier: KycTier): Observable<any> {
    return this.http.post('/v1/kyc/tiers', tier)
      .pipe(catchError(this.handleError.bind(this)));
  }

  updateTier(tierId: number | string, tier: Partial<KycTier>): Observable<any> {
    return this.http.put(`/v1/kyc/tiers/${tierId}`, tier)
      .pipe(catchError(this.handleError.bind(this)));
  }

  // -------------------------------------------------------------------------
  // Gestion : Documents KYC d'un Client
  // POST body: { documentTypeId*, documentNumber?, issueDate?, expiryDate?,
  //              fileLocation?, verificationStatus?, remarks?, locale, dateFormat }
  // -------------------------------------------------------------------------

  getClientDocuments(clientId: string | number): Observable<KycDocument[]> {
    return this.http.get<KycDocument[]>(`/v1/clients/${clientId}/kyc/documents`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  getClientDocument(clientId: string | number, documentId: string | number): Observable<KycDocument> {
    return this.http.get<KycDocument>(`/v1/clients/${clientId}/kyc/documents/${documentId}`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  createClientDocument(clientId: string | number, data: any, file?: File): Observable<any> {
    const formData = new FormData();
    if (data.documentTypeId) formData.append('documentTypeId', data.documentTypeId);
    formData.append('locale', data.locale || 'en');
    formData.append('dateFormat', data.dateFormat || 'yyyy-MM-dd');

    if (data.documentNumber) formData.append('documentNumber', data.documentNumber);
    if (data.remarks) formData.append('remarks', data.remarks);
    if (data.issueDate) formData.append('issueDate', data.issueDate);
    if (data.expiryDate) formData.append('expiryDate', data.expiryDate);

    if (file) {
      formData.append('file', file, file.name);
    }

    return this.http.post(`/v1/clients/${clientId}/kyc/documents`, formData)
      .pipe(catchError(this.handleError.bind(this)));
  }

  updateClientDocument(clientId: string | number, documentId: string | number, documentData: Partial<KycDocumentCreateRequest>, file?: File, verificationStatusOverride?: number): Observable<any> {
    const formData = new FormData();
    if (documentData.documentTypeId) formData.append('documentTypeId', documentData.documentTypeId.toString());
    if (documentData.locale) formData.append('locale', documentData.locale);
    if (documentData.dateFormat) formData.append('dateFormat', documentData.dateFormat);
    if (documentData.documentNumber) formData.append('documentNumber', documentData.documentNumber);
    if (documentData.remarks) formData.append('remarks', documentData.remarks);
    if (documentData.issueDate) formData.append('issueDate', documentData.issueDate);
    if (documentData.expiryDate) formData.append('expiryDate', documentData.expiryDate);
    if (verificationStatusOverride !== undefined) formData.append('verificationStatus', verificationStatusOverride.toString());

    if (file) {
      formData.append('file', file, file.name);
    }

    return this.http.put(`/v1/clients/${clientId}/kyc/documents/${documentId}`, formData)
      .pipe(catchError(this.handleError.bind(this)));
  }

  downloadClientDocument(clientId: string | number, documentId: string | number): Observable<Blob> {
    return this.http.get(`/v1/clients/${clientId}/kyc/documents/${documentId}/attachment`, { responseType: 'blob' })
      .pipe(catchError(this.handleError.bind(this)));
  }

  // -------------------------------------------------------------------------
  // Workflow (Maker-Checker) : POST /kyc/documents/{documentId}?command=submit|approve|reject
  // Le body est vide, l'action est transmise via le query param "command"
  // -------------------------------------------------------------------------

  executeWorkflowAction(documentId: string | number, command: KycDocumentActionType): Observable<any> {
    const params = new HttpParams().set('command', command);
    return this.http.post(`/v1/kyc/documents/${documentId}`, {}, { params })
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Updates the verification status of a specific document for a client
   */
  /**
   * Updates the verification status of a specific document for a client.
   * Handles the sequential workflow:
   *   PENDING (100) → submit → UNDER_REVIEW (200) → approve/reject → VERIFIED(300)/REJECTED(400)
   *
   * If the document is still in PENDING state and the target is approve or reject,
   * this will first submit, then perform the action.
   */
  updateDocumentStatus(clientId: number | string, documentId: number | string, statusId: number, currentStatusId?: number, remarks?: string): Observable<any> {
    // If document is PENDING (100) and we want to approve (300) or reject (400),
    // we need to first submit it to UNDER_REVIEW (200)
    if (currentStatusId === 100 && (statusId === 300 || statusId === 400)) {
      // Chain: submit first, then approve/reject
      return new Observable(observer => {
        this.executeDocumentCommand(documentId, 'submit').subscribe({
          next: () => {
            // Now approve or reject
            const command = statusId === 300 ? 'approve' : 'reject';
            this.executeDocumentCommand(documentId, command, remarks).subscribe({
              next: (result) => { observer.next(result); observer.complete(); },
              error: (err) => { observer.error(err); }
            });
          },
          error: (err) => { observer.error(err); }
        });
      });
    }

    // Direct transition
    let command = 'approve';
    if (statusId === 400) command = 'reject';
    if (statusId === 200) command = 'submit';

    // Bypassing workflow for Undo action (submit requires PENDING state)
    if (command === 'submit' && currentStatusId !== 100) {
      return this.updateClientDocument(clientId, documentId, { locale: 'en' } as any, undefined, statusId);
    }

    return this.executeDocumentCommand(documentId, command, remarks);
  }

  /**
   * Executes a workflow command on a KYC document (submit, approve, reject)
   */
  private executeDocumentCommand(documentId: number | string, command: string, remarks?: string): Observable<any> {
    const body = remarks ? { remarks, comments: remarks } : {};
    return this.http.post(`/v1/kyc/documents/${documentId}?command=${command}`, body);
  }

  /**
   * Récupère tous les documents KYC (la liste ne supporte pas de filtre ?status côté backend actuel).
   */
  getAllDocuments(): Observable<KycDocument[]> {
    return this.http.get<KycDocument[]>('/v1/kyc/documents')
      .pipe(catchError((err) => {
        if (err.status === 404) {
          console.warn('API /v1/kyc/documents non implémentée sur le backend, retour d\'un tableau vide.');
          return of([]);
        }
        return this.handleError(err);
      }));
  }

  // -------------------------------------------------------------------------
  // KYC Case Management APIs
  // -------------------------------------------------------------------------

  createKycCase(clientId: string | number): Observable<any> {
    return this.http.post(`/v1/kyc/cases`, { clientId })
      .pipe(catchError(this.handleError.bind(this)));
  }

  getDashboardStats(): Observable<any> {
    return this.http.get<any>('/v1/kyc/dashboard/stats')
      .pipe(catchError(this.handleError.bind(this)));
  }

  getCases(params?: any): Observable<any> {
    return this.http.get<any>('/v1/kyc/cases', { params })
      .pipe(catchError(this.handleError.bind(this)));
  }

  getCase(caseId: number | string): Observable<any> {
    return this.http.get<any>(`/v1/kyc/cases/${caseId}`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  createCase(data: any): Observable<any> {
    return this.http.post('/v1/kyc/cases', data)
      .pipe(catchError(this.handleError.bind(this)));
  }

  transitionWorkflow(caseId: number | string, workflowStatus: number, comments?: string): Observable<any> {
    const params = new HttpParams().set('command', 'transition');
    return this.http.post(`/v1/kyc/cases/${caseId}`, { workflowStatus, comments, locale: 'en' }, { params })
      .pipe(catchError(this.handleError.bind(this)));
  }

  assignAgent(caseId: number | string, assignedAgentId: number, assignmentStatus: number, comments?: string): Observable<any> {
    return this.http.post(`/v1/kyc/cases/${caseId}/assign`, { assignedAgentId, assignmentStatus, comments, locale: 'en' })
      .pipe(catchError(this.handleError.bind(this)));
  }

  updateRisk(caseId: number | string, data: any): Observable<any> {
    const payload = { ...data, locale: 'en' };
    return this.http.put(`/v1/kyc/cases/${caseId}/risk`, payload)
      .pipe(catchError(this.handleError.bind(this)));
  }

  getCaseHistory(caseId: number | string): Observable<any[]> {
    return this.http.get<any[]>(`/v1/kyc/cases/${caseId}/history`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  updateEdd(caseId: number | string, escalationReason?: string, complianceNotes?: string): Observable<any> {
    const payload = { escalationReason, complianceNotes, locale: 'en' };
    return this.http.put(`/v1/kyc/cases/${caseId}/edd`, payload)
      .pipe(catchError(this.handleError.bind(this)));
  }

  getCaseAudit(caseId: number | string): Observable<any[]> {
    return this.http.get<any[]>(`/v1/kyc/cases/${caseId}/audit`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  addFlag(caseId: number | string, flagTypeCode: string, remarks?: string): Observable<any> {
    return this.http.post(`/v1/kyc/cases/${caseId}/flags`, { flagTypeCode, remarks, locale: 'en' })
      .pipe(catchError(this.handleError.bind(this)));
  }

  resolveFlag(caseId: number | string, flagId: number | string, statusId: number, resolutionRemarks?: string): Observable<any> {
    return this.http.put(`/v1/kyc/cases/${caseId}/flags/${flagId}`, { statusId, resolutionRemarks, locale: 'en' })
      .pipe(catchError(this.handleError.bind(this)));
  }
}
