import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { KycService } from 'app/kyc/services/kyc.service';
import { KycDocument, KycCaseData } from 'app/kyc/models/kyc.model';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { MatDialog } from '@angular/material/dialog';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { UploadKycDocumentDialogComponent } from './upload-kyc-document-dialog/upload-kyc-document-dialog.component';
import { DocumentPreviewService } from 'app/shared/services/document-preview.service';
import lightGallery from 'lightgallery';
import lgFullscreen from 'lightgallery/plugins/fullscreen';
import lgThumbnail from 'lightgallery/plugins/thumbnail';
import lgZoom from 'lightgallery/plugins/zoom';
import type { LightGallery } from 'lightgallery/lightgallery';
import type { GalleryItem } from 'lightgallery/lg-utils';
import { map } from 'rxjs/operators';

@Component({
  selector: 'mifosx-kyc-tab',
  templateUrl: './kyc-tab.component.html',
  styleUrls: ['./kyc-tab.component.scss'],
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    MatTableModule,
    MatTooltipModule,
    MatButtonModule
  ]
})
export class KycTabComponent implements OnInit, OnDestroy {
  clientId!: string;
  kycDocuments: (KycDocument & { fileName?: string })[] = [];
  kycCase: KycCaseData | null = null;
  isLoading = true;
  displayedColumns: string[] = ['documentType', 'fileName', 'issueDate', 'expiryDate', 'status', 'actions'];

  @ViewChild('lightboxRoot', { static: true }) lightboxRoot!: ElementRef<HTMLElement>;

  private lightboxInstance: LightGallery | null = null;
  private readonly lightboxPlugins = [
    lgZoom,
    lgThumbnail,
    lgFullscreen
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private kycService: KycService,
    private dialog: MatDialog,
    private documentPreviewService: DocumentPreviewService
  ) { }

  ngOnInit() {
    this.route.parent?.paramMap.subscribe(params => {
      const id = params.get('clientId');
      if (id) {
        this.clientId = id;
        this.fetchKycData();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyLightbox();
    if (this.kycDocuments) {
      this.kycDocuments.forEach((doc: any) => {
        if (doc.id) this.documentPreviewService.release(doc.id.toString());
      });
    }
  }

  fetchKycData() {
    this.isLoading = true;
    
    // Fetch Kyc Case
    this.kycService.getCases().subscribe({
      next: (data: any) => {
        const items = data?.pageItems ? data.pageItems : (Array.isArray(data) ? data : []);
        const sortedItems = items.filter((c: any) => c.clientId === Number(this.clientId)).sort((a: any, b: any) => b.id - a.id);
        if (sortedItems.length > 0) {
          this.kycCase = sortedItems[0];
        } else {
          this.kycCase = null;
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });

    // Fetch Kyc Documents
    this.kycService.getClientDocuments(this.clientId).subscribe((documents: any[]) => {
      this.kycDocuments = documents.map(doc => ({
        ...doc,
        verificationStatusName: doc.verificationStatus?.value || 'UNKNOWN',
        fileName: doc.fileLocation ? doc.fileLocation.split(/[/\\]/).pop() : undefined
      }));
    });
  }

  openUploadDialog() {
    const dialogRef = this.dialog.open(UploadKycDocumentDialogComponent, {
      width: '620px',
      panelClass: 'upload-kyc-dialog',
      autoFocus: false,
      data: { clientId: this.clientId }
    });

    dialogRef.afterClosed().subscribe((success: boolean) => {
      if (success) {
        this.fetchKycData();
      }
    });
  }

  goToCase() {
    if (this.kycCase?.id) {
      this.router.navigate(['/kyc/cases', this.kycCase.id]);
    }
  }

  get progressPercentage(): number {
    if (!this.kycCase || !this.kycCase.requiredDocumentCount) return 0;
    const pct = (this.kycCase.submittedDocumentCount / this.kycCase.requiredDocumentCount) * 100;
    return pct > 100 ? 100 : pct;
  }

  isPreviewable(document: any): boolean {
    return this.documentPreviewService.isPreviewable({ ...document, id: document.id?.toString() });
  }

  async openPreview(document: any): Promise<void> {
    const docDescriptor = { ...document, id: document.id?.toString() };
    if (!this.isPreviewable(docDescriptor)) {
      this.downloadDocument(document);
      return;
    }
    try {
      const previewables = this.kycDocuments.filter((doc: any) => this.isPreviewable({ ...doc, id: doc.id?.toString() }));
      const galleryItems: GalleryItem[] = [];

      for (const item of previewables) {
        const itemDescriptor = { ...item, id: item.id?.toString() };
        try {
          const preview = await this.documentPreviewService.resolvePreviewUrl(itemDescriptor, (descriptor: any) =>
            this.kycService.downloadClientDocument(this.clientId, descriptor.id).pipe(
              map(blob => {
                if (blob.type === 'application/octet-stream' || !blob.type) {
                  const ext = descriptor.fileName?.split('.').pop()?.toLowerCase();
                  let mimeType = 'application/octet-stream';
                  if (ext === 'pdf') mimeType = 'application/pdf';
                  else if (ext === 'png') mimeType = 'image/png';
                  else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                  else if (ext === 'webp') mimeType = 'image/webp';
                  return new Blob([blob], { type: mimeType });
                }
                return blob;
              })
            )
          );

          galleryItems.push({
            id: itemDescriptor.id,
            src: preview.url,
            thumb: preview.type === 'image' ? preview.url : undefined,
            subHtml: this.buildSubHtml(itemDescriptor),
            iframe: preview.type === 'pdf'
          } as any);
        } catch (error) {
          console.error('Preview failed for document', itemDescriptor.id, error);
        }
      }

      if (!galleryItems.length) {
        alert('Impossible de visualiser ce document.');
        return;
      }

      const startIndex = Math.max(
        0,
        galleryItems.findIndex((item: any) => item.id === document.id?.toString())
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

  private buildSubHtml(document: any): string {
    const filename = document.fileName ? `<p class="lg-meta">${this.escapeHtml(document.fileName)}</p>` : '';
    return `<div class="lg-caption"><h4>${this.escapeHtml(document.documentTypeName || 'Document KYC')}</h4>${filename}</div>`;
  }

  private escapeHtml(value: string): string {
    return value
      ? value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      : '';
  }

  downloadDocument(doc: KycDocument) {
    if (!doc.id) return;
    this.kycService.downloadClientDocument(this.clientId, doc.id).subscribe((blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileLocation ? doc.fileLocation.split('/').pop() || `Document_${doc.documentNumber}` : `Document_${doc.documentNumber}`;
      link.target = '_blank';
      link.click();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    });
  }
}
