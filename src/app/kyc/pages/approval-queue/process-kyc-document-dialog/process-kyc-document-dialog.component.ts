import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe, CommonModule } from '@angular/common';

import { KycService } from '../../../services/kyc.service';
import { KycDocument, KycDocumentActionType, KycDocumentStatusMap } from '../../../models/kyc.model';

@Component({
  standalone: false,
  selector: 'mifosx-process-kyc-document-dialog',
  templateUrl: './process-kyc-document-dialog.component.html',
  styleUrls: ['./process-kyc-document-dialog.component.scss'],
  providers: [DatePipe]
})
export class ProcessKycDocumentDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<ProcessKycDocumentDialogComponent>);
  private kycService = inject(KycService);
  data = inject(MAT_DIALOG_DATA);

  document: KycDocument;
  documentTypeName = 'Unknown';
  isProcessing = false;

  // Libellé du statut actuel
  get statusLabel(): string {
    const val = this.document?.verificationStatus;
    return val !== undefined ? (KycDocumentStatusMap[val] ?? `${val}`) : 'UNKNOWN';
  }

  ngOnInit() {
    this.document = this.data.document;
    this.resolveDocumentTypeName();
  }

  resolveDocumentTypeName() {
    this.kycService.getDocumentTypes().subscribe({
      next: (types) => {
        const type = types.find(t => t.id === this.document.documentTypeId);
        if (type) {
          this.documentTypeName = type.name;
        }
      }
    });
  }

  openDocument() {
    if (this.document.fileLocation) {
      window.open(this.document.fileLocation, '_blank');
    }
  }

  /**
   * Exécute une action workflow sur le document.
   * L'API attend : POST /kyc/documents/{id}?command=submit|approve|reject
   * Le body est vide.
   */
  process(command: KycDocumentActionType) {
    this.isProcessing = true;
    this.kycService.executeWorkflowAction(this.document.id, command).subscribe({
      next: () => {
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error processing document', err);
        this.isProcessing = false;
      }
    });
  }
}
