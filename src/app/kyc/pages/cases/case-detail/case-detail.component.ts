import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { KycService } from '../../../services/kyc.service';
import { KycCaseData, KycCaseHistoryData } from '../../../models/kyc.model';
import { DocumentPreviewService } from 'app/shared/services/document-preview.service';
import lightGallery from 'lightgallery';
import lgFullscreen from 'lightgallery/plugins/fullscreen';
import lgThumbnail from 'lightgallery/plugins/thumbnail';
import lgZoom from 'lightgallery/plugins/zoom';
import type { LightGallery } from 'lightgallery/lightgallery';
import type { GalleryItem } from 'lightgallery/lg-utils';
import { map } from 'rxjs/operators';
import { AuthenticationService } from '../../../../core/authentication/authentication.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatTooltipModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    FormsModule,
    FaIconComponent
  ],
  selector: 'mifosx-kyc-case-detail',
  templateUrl: './case-detail.component.html',
  styleUrls: ['./case-detail.component.scss']
})
export class CaseDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private kycService = inject(KycService);
  private documentPreviewService = inject(DocumentPreviewService);
  private authenticationService = inject(AuthenticationService);

  @ViewChild('lightboxRoot', { static: true }) lightboxRoot!: ElementRef<HTMLElement>;
  private lightboxInstance: LightGallery | null = null;
  private readonly lightboxPlugins = [lgZoom, lgThumbnail, lgFullscreen];

  caseId!: number;
  kycCase!: KycCaseData;
  history: KycCaseHistoryData[] = [];
  
  showAddFlagForm = false;
  newFlagType = '';
  newFlagRemarks = '';
  
  lastVisitDate: Date | null = null;
  
  selectedTabIndex = 0;

  constructor() {}

  get currentAgentId(): number {
    const creds = this.authenticationService.getCredentials();
    return creds ? creds.userId : 1;
  }

  get currentAgentName(): string {
    const creds = this.authenticationService.getCredentials();
    return creds ? creds.username : 'Current User';
  }

  ngOnInit() {
    this.caseId = Number(this.route.snapshot.paramMap.get('caseId'));
    
    // Track agent's last visit to determine if documents are NEW
    const lsKey = `kyc_case_last_visit_${this.caseId}`;
    const stored = localStorage.getItem(lsKey);
    if (stored) {
      this.lastVisitDate = new Date(parseInt(stored, 10));
    } else {
      this.lastVisitDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
    }
    setTimeout(() => {
        localStorage.setItem(lsKey, Date.now().toString());
    }, 5000);

    this.loadCase();
  }

  loadCase() {
    this.kycService.getCase(this.caseId).subscribe({
      next: (data: any) => {
        this.kycCase = data;
        
        // Convert dates from arrays to Date objects
        if (this.kycCase.nextReviewDate && Array.isArray(this.kycCase.nextReviewDate)) {
          const [y, m, d] = this.kycCase.nextReviewDate;
          this.kycCase.nextReviewDate = new Date(y, m - 1, d).toISOString();
        }
        
        if (this.kycCase.documents && Array.isArray(this.kycCase.documents)) {
          this.kycCase.documents.forEach((doc: any) => {
            if (doc.expiryDate && Array.isArray(doc.expiryDate)) {
              const [y, m, d] = doc.expiryDate;
              doc.expiryDate = new Date(y, m - 1, d).toISOString();
            }
          });
        }
        
        // Ensure assigned agent name is correct if assigned to current user
        if (this.kycCase.assignedAgentId === this.currentAgentId && 
            (!this.kycCase.assignedAgentName || this.kycCase.assignedAgentName.startsWith('Agent '))) {
          this.kycCase.assignedAgentName = this.currentAgentName;
        }

        // Fetch documents for the client attached to this case
        if (this.kycCase.clientId) {
          this.kycService.getClientDocuments(this.kycCase.clientId).subscribe({
            next: (docs) => {
              this.kycCase.documents = docs;
              if (this.kycCase.documents && Array.isArray(this.kycCase.documents)) {
                this.kycCase.documents.forEach((doc: any) => {
                  if (doc.expiryDate && Array.isArray(doc.expiryDate)) {
                    const [y, m, d] = doc.expiryDate;
                    doc.expiryDate = new Date(y, m - 1, d).toISOString();
                  }
                });
              }
              // Load history after everything else is ready
              this.loadHistory();
            },
            error: (err) => {
              console.error('Error fetching documents for case', err);
              this.loadHistory(); // Still load history if docs fail
            }
          });
        } else {
          this.loadHistory();
        }
      },
      error: (err: any) => console.error('Error fetching case', err)
    });
  }

  loadHistory() {
    this.kycService.getCaseHistory(this.caseId).subscribe({
      next: (data: any[]) => {
        let unifiedAudit: any[] = [];
        
        // 1. Workflow History
        if (data && data.length) {
          unifiedAudit = data.map((h: any) => {
             let parsedDate: Date;
             if (h.createdDate && Array.isArray(h.createdDate)) {
               if (h.createdDate.length >= 6) {
                 const [y, m, d, hr, min, sec] = h.createdDate;
                 parsedDate = new Date(y, m - 1, d, hr, min, sec);
               } else {
                 const [y, m, d] = h.createdDate;
                 parsedDate = new Date(y, m - 1, d);
               }
             } else {
               parsedDate = new Date(h.createdDate || new Date());
             }
             
             let actionStr = '';
             let iconStr = 'exchange-alt';
             let colorStr = '#3b82f6';
             
             if (h.toStatusValue) {
               actionStr = `${h.fromStatusValue || 'Created'} ➔ ${h.toStatusValue}`;
             } else if (h.toAssignmentStatusValue) {
               actionStr = `Assignment: ${h.fromAssignmentStatusValue || 'Unassigned'} ➔ ${h.toAssignmentStatusValue}`;
               iconStr = 'user-check';
               colorStr = '#8b5cf6';
             } else {
               actionStr = 'System Update';
               iconStr = 'circle';
               colorStr = '#9e9e9e';
             }

             return {
               action: actionStr,
               date: parsedDate.toISOString(),
               actor: h.actorUsername || 'System',
               comments: h.comments,
               icon: iconStr,
               color: colorStr
             };
          });
        }

        // 2. Flags
        if (this.kycCase && this.kycCase.flags) {
           this.kycCase.flags.forEach((f: any) => {
              let fDate: Date;
              if (f.createdDate && Array.isArray(f.createdDate)) {
                 if (f.createdDate.length >= 6) {
                   const [y, m, d, hr, min, sec] = f.createdDate;
                   fDate = new Date(y, m - 1, d, hr, min, sec);
                 } else {
                   const [y, m, d] = f.createdDate;
                   fDate = new Date(y, m - 1, d);
                 }
              } else {
                 fDate = new Date(f.createdDate || f.lastModifiedDate || new Date());
              }
              
              unifiedAudit.push({
                 action: `Flag Added: ${f.flagType?.value || f.flagType?.code}`,
                 date: fDate.toISOString(),
                 actor: f.createdByUsername || 'System',
                 comments: f.remarks,
                 icon: 'flag',
                 color: '#ef4444'
              });
              
              if (f.status?.id === 200 || f.status?.id === 300) {
                  let resDate: Date;
                  if (f.lastModifiedDate && Array.isArray(f.lastModifiedDate)) {
                     if (f.lastModifiedDate.length >= 6) {
                       const [y, m, d, hr, min, sec] = f.lastModifiedDate;
                       resDate = new Date(y, m - 1, d, hr, min, sec);
                     } else {
                       const [y, m, d] = f.lastModifiedDate;
                       resDate = new Date(y, m - 1, d);
                     }
                  } else {
                     resDate = new Date(f.lastModifiedDate || new Date());
                  }
                  unifiedAudit.push({
                     action: `Flag Resolved: ${f.flagType?.value || f.flagType?.code} (${f.status?.value})`,
                     date: resDate.toISOString(),
                     actor: f.lastModifiedByUsername || 'System',
                     comments: f.resolutionRemarks,
                     icon: 'check-circle',
                     color: '#10b981'
                  });
              }
           });
        }
        
        // 3. Current Assignment
        if (this.kycCase && this.kycCase.assignedAgentId) {
            let aDate: Date;
            if (this.kycCase.lastModifiedDate && Array.isArray(this.kycCase.lastModifiedDate)) {
               if (this.kycCase.lastModifiedDate.length >= 6) {
                 const [y, m, d, hr, min, sec] = this.kycCase.lastModifiedDate;
                 aDate = new Date(y, m - 1, d, hr, min, sec);
               } else {
                 const [y, m, d] = this.kycCase.lastModifiedDate;
                 aDate = new Date(y, m - 1, d);
               }
            } else {
               aDate = new Date(this.kycCase.lastModifiedDate || new Date());
            }
            unifiedAudit.push({
                 action: `Assigned to ${this.kycCase.assignedAgentName || 'Agent ' + this.kycCase.assignedAgentId}`,
                 date: aDate.toISOString(),
                 actor: 'System',
                 comments: '',
                 icon: 'user-check',
                 color: '#8b5cf6'
            });
        }

        // Sort by date descending
        unifiedAudit.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        this.history = unifiedAudit;
      },
      error: () => this.history = []
    });
  }

  updateWorkflow(status: number) {
    // Require confirmation for destructive actions
    if (status === 500) {
      const confirmed = window.confirm(
        `Are you sure you want to REJECT this KYC case for "${this.kycCase.clientName}"?\n\nThis action cannot be undone easily.`
      );
      if (!confirmed) return;
    }
    if (status === 600) {
      const confirmed = window.confirm(
        `Are you sure you want to CLOSE this KYC case for "${this.kycCase.clientName}"?\n\nThe case will no longer be editable.`
      );
      if (!confirmed) return;
    }

    this.kycService.transitionWorkflow(this.caseId, status, 'Action from UI').subscribe({
      next: () => {
        this.loadCase();
      },
      error: (err: any) => {
        console.error('Workflow transition failed', err);
        alert('Action failed. Check console for details.');
      }
    });
  }

  assignAgent() {
    const agentId = this.currentAgentId;
    const agentName = this.currentAgentName;
    this.kycService.assignAgent(this.caseId, agentId, 200, 'Self assigned').subscribe({
      next: () => {
        // Immediately reflect the agent name in the UI before reload
        if (this.kycCase) {
          this.kycCase.assignedAgentId = agentId;
          this.kycCase.assignedAgentName = agentName;
        }
        this.loadCase();
      },
      error: (err: any) => console.error('Assignment failed', err)
    });
  }

  addFlag() {
    if (!this.newFlagType) return;
    
    const flagTypeCode = this.newFlagType;
    const remarks = this.newFlagRemarks;
    
    this.kycService.addFlag(this.caseId, flagTypeCode, remarks).subscribe({
      next: (res: any) => {
        this.showAddFlagForm = false;
        this.newFlagType = '';
        this.newFlagRemarks = '';
        
        if (this.kycCase) {
          if (!this.kycCase.flags) this.kycCase.flags = [];
          const now = new Date();
          this.kycCase.flags.unshift({
            id: res?.resourceId || Date.now(),
            flagType: { code: flagTypeCode, value: flagTypeCode },
            status: { id: 100, code: 'ACTIVE', value: 'Active' },
            remarks: remarks,
            createdDate: [now.getFullYear(), now.getMonth() + 1, now.getDate()],
            createdByUsername: this.currentAgentName
          });
        }
        
        this.loadCase();
      },
      error: (err: any) => {
        console.error('Failed to add flag', err);
        alert('Error adding flag.');
      }
    });
  }

  resolveFlag(flag: any) {
    const remarks = prompt('Enter a resolution remark:');
    if (remarks !== null) {
      this.kycService.resolveFlag(this.caseId, flag.id, 200, remarks).subscribe({
        next: () => {
          this.loadCase();
        },
        error: (err: any) => console.error('Failed to resolve flag', err)
      });
    }
  }

  markFlagFalsePositive(flag: any) {
    const remarks = prompt('Enter reason for false positive:');
    if (remarks !== null) {
      this.kycService.resolveFlag(this.caseId, flag.id, 300, remarks).subscribe({
        next: () => {
          this.loadCase();
        },
        error: (err: any) => console.error('Failed to mark flag as false positive', err)
      });
    }
  }

  ngOnDestroy(): void {
    this.destroyLightbox();
    if (this.kycCase && this.kycCase.documents) {
      this.kycCase.documents.forEach((doc: any) => {
        if (doc.id) this.documentPreviewService.release(doc.id.toString());
      });
    }
  }

  get lastUpdatedDate(): string | null {
    if (this.kycCase?.lastModifiedDate) {
      if (Array.isArray(this.kycCase.lastModifiedDate)) {
        const [y, m, d] = this.kycCase.lastModifiedDate;
        return new Date(y, m - 1, d).toISOString();
      }
      return this.kycCase.lastModifiedDate;
    }
    if (this.history && this.history.length > 0) {
      const latest = this.history.reduce((latestDate, current) => {
        return new Date(current.createdDate) > new Date(latestDate) ? current.createdDate : latestDate;
      }, this.history[0].createdDate);
      return latest;
    }
    return null;
  }

  get isReviewDue(): boolean {
    return this.kycCase?.flags?.some((f: any) => f.flagType?.code === 'PERIODIC_REVIEW_DUE' && f.status?.id === 100) || false;
  }

  get hasExpirationWarning(): boolean {
    return this.kycCase?.flags?.some((f: any) => f.flagType?.code === 'EXPIRING_SOON' && f.status?.id === 100) || false;
  }

  isDocumentExpired(doc: any): boolean {
    if (doc.verificationStatus?.id === 500) return true;
    if (doc.expiryDate) {
      const expDate = new Date(doc.expiryDate);
      if (expDate < new Date()) return true;
    }
    return false;
  }

  isDocumentNew(doc: any): boolean {
    if (!doc?.createdDate) return false;
    let d: Date;
    if (Array.isArray(doc.createdDate)) {
      if (doc.createdDate.length >= 6) {
         d = new Date(doc.createdDate[0], doc.createdDate[1] - 1, doc.createdDate[2], doc.createdDate[3], doc.createdDate[4], doc.createdDate[5]);
      } else {
         d = new Date(doc.createdDate[0], doc.createdDate[1] - 1, doc.createdDate[2]);
      }
    } else {
      d = new Date(doc.createdDate);
    }
    
    return this.lastVisitDate ? d > this.lastVisitDate : false;
  }

  /** Open document in LightGallery viewer */
  async viewDocument(doc: any): Promise<void> {
    if (!doc.id) return;
    
    const docDescriptor = { 
      id: doc.id.toString(), 
      fileName: doc.documentTypeName || 'document',
      mimeType: undefined as string | undefined
    };
    
    const isPreviewable = this.documentPreviewService.isPreviewable(docDescriptor);
    
    if (!isPreviewable) {
      // Fallback: download and open in new tab for non-previewable files
      this.kycService.downloadClientDocument(this.kycCase.clientId, doc.id).subscribe((blob: Blob) => {
        let mimeType = blob.type;
        if (!mimeType || mimeType === 'application/octet-stream') {
          const name = (doc.documentTypeName || '').toLowerCase();
          if (name.includes('pdf')) mimeType = 'application/pdf';
          else if (name.includes('png')) mimeType = 'image/png';
          else if (name.includes('jpg') || name.includes('jpeg')) mimeType = 'image/jpeg';
        }
        const fileBlob = new Blob([blob], { type: mimeType || 'application/pdf' });
        const url = window.URL.createObjectURL(fileBlob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 5000);
      });
      return;
    }
    
    try {
      const previewableDocs = (this.kycCase.documents || []).filter((d: any) => 
        this.documentPreviewService.isPreviewable({ id: d.id?.toString(), fileName: d.documentTypeName })
      );
      
      const galleryItems: GalleryItem[] = [];
      
      for (const item of previewableDocs) {
        const itemDescriptor = { id: item.id?.toString(), fileName: item.documentTypeName };
        try {
          const preview = await this.documentPreviewService.resolvePreviewUrl(itemDescriptor, (descriptor: any) =>
            this.kycService.downloadClientDocument(this.kycCase.clientId, descriptor.id).pipe(
              map(blob => {
                if (blob.type === 'application/octet-stream' || !blob.type) {
                  const ext = descriptor.fileName?.split('.').pop()?.toLowerCase();
                  let mime = 'application/octet-stream';
                  if (ext === 'pdf') mime = 'application/pdf';
                  else if (ext === 'png') mime = 'image/png';
                  else if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
                  else if (ext === 'webp') mime = 'image/webp';
                  return new Blob([blob], { type: mime });
                }
                return blob;
              })
            )
          );

          galleryItems.push({
            id: itemDescriptor.id,
            src: preview.url,
            thumb: preview.type === 'image' ? preview.url : undefined,
            subHtml: `<div class="lg-caption"><h4>${this.escapeHtml(item.documentTypeName || 'KYC Document')}</h4><p class="lg-meta">ID: ${this.escapeHtml(item.documentNumber || 'N/A')}</p></div>`,
            iframe: preview.type === 'pdf'
          } as any);
        } catch (error) {
          console.error('Preview failed for document', itemDescriptor.id, error);
        }
      }
      
      if (!galleryItems.length) {
        alert('Unable to preview this document.');
        return;
      }
      
      const startIndex = Math.max(
        0,
        galleryItems.findIndex((item: any) => item.id === doc.id?.toString())
      );
      
      this.destroyLightbox();
      this.lightboxInstance = lightGallery(this.lightboxRoot.nativeElement, {
        dynamic: true,
        dynamicEl: galleryItems,
        plugins: this.lightboxPlugins,
        download: false,
        closable: true,
        escKey: true,
        zoomFromOrigin: true
      });
      
      this.lightboxInstance.openGallery(startIndex);
    } catch (error) {
      console.error('Unable to open preview', error);
    }
  }

  private destroyLightbox(): void {
    if (this.lightboxInstance) {
      this.lightboxInstance.destroy();
      this.lightboxInstance = null;
    }
  }

  private escapeHtml(value: string): string {
    return value
      ? value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      : '';
  }

  updateDocumentStatus(doc: any, statusId: number) {
    if (statusId === 300 && this.isDocumentExpired(doc)) {
      alert("This document is expired and cannot be approved.");
      return;
    }

    let remarks: string | undefined = undefined;
    if (statusId === 400) {
      const reason = prompt('Please enter the reason for rejection:');
      if (reason === null || reason.trim() === '') {
        return; // User canceled or provided empty reason
      }
      remarks = reason.trim();
    } else if (statusId === 200) {
      const confirmed = window.confirm('Do you want to re-evaluate this document? Its status will revert to "Under Review".');
      if (!confirmed) return;
      remarks = 'Re-evaluation requested.';
    }

    const currentStatusId = doc.verificationStatus?.id;
    this.kycService.updateDocumentStatus(this.kycCase.clientId, doc.id, statusId, currentStatusId, remarks).subscribe({
      next: () => {
        this.loadCase();
      },
      error: (err: any) => {
        console.error('Failed to update document status', err);
        alert('Action failed. Check console for details.');
      }
    });
  }
}
