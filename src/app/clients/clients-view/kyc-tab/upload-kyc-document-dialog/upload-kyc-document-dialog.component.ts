import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { SettingsService } from 'app/settings/settings.service';
import { ErrorHandlerService } from 'app/core/error-handler/error-handler.service';
import { KycService } from 'app/kyc/services/kyc.service';
import { KycDocumentType } from 'app/kyc/models/kyc.model';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { MatIconModule } from '@angular/material/icon';
import { MatNativeDateModule } from '@angular/material/core';


@Component({
  selector: 'mifosx-upload-kyc-document-dialog',
  templateUrl: './upload-kyc-document-dialog.component.html',
  styleUrls: ['./upload-kyc-document-dialog.component.scss'],
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIconModule,
    MatNativeDateModule
  ]
})
export class UploadKycDocumentDialogComponent implements OnInit {
  documentForm!: FormGroup;
  documentTypes: KycDocumentType[] = [];
  selectedFile: File | null = null;
  fileError: string | null = null;
  isUploading = false;
  readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo (limite backend Fineract)

  constructor(
    public dialogRef: MatDialogRef<UploadKycDocumentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { clientId: string | number },
    private formBuilder: FormBuilder,
    private kycService: KycService,
    private settingsService: SettingsService,
    private errorHandlerService: ErrorHandlerService
  ) { }

  ngOnInit() {
    this.createForm();
    this.fetchDocumentTypes();
  }

  createForm() {
    this.documentForm = this.formBuilder.group({
      documentTypeId: ['', Validators.required],
      documentNumber: [''],
      issueDate: [''],
      expiryDate: [''],
      remarks: ['']
    }, { validators: this.dateValidator });
  }

  private dateValidator(group: AbstractControl): ValidationErrors | null {
    const issueDate = group.get('issueDate')?.value;
    const expiryDate = group.get('expiryDate')?.value;
    if (issueDate && expiryDate && new Date(expiryDate) <= new Date(issueDate)) {
      return { invalidDateRange: true };
    }
    return null;
  }

  fetchDocumentTypes() {
    this.kycService.getDocumentTypes().subscribe((types: KycDocumentType[]) => {
      this.documentTypes = types.filter(t => t.active);
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    this.fileError = null;

    if (file) {
      if (file.size > this.MAX_FILE_SIZE) {
        this.fileError = 'Le fichier est trop volumineux (limite: 5 Mo)';
        this.selectedFile = null;
      } else {
        this.selectedFile = file;
      }
    }
    // Réinitialise l'input pour permettre de resélectionner le même fichier après une erreur
    event.target.value = null;
  }

  submit() {
    if (this.documentForm.valid && this.selectedFile && !this.isUploading) {
      this.isUploading = true;
      const formValue = this.documentForm.value;
      const locale = this.settingsService.language.code || 'en';

      const data: any = {
        documentTypeId: formValue.documentTypeId,
        locale: locale,
        dateFormat: 'yyyy-MM-dd'
      };

      if (formValue.documentNumber) data.documentNumber = formValue.documentNumber;
      if (formValue.remarks) data.remarks = formValue.remarks;

      if (formValue.issueDate) {
        data.issueDate = this.formatDate(formValue.issueDate);
      }
      if (formValue.expiryDate) {
        data.expiryDate = this.formatDate(formValue.expiryDate);
      }

      this.kycService.createClientDocument(this.data.clientId, data, this.selectedFile).subscribe({
        next: () => {
          this.errorHandlerService.showSuccess('Document uploadé avec succès');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isUploading = false;
          this.errorHandlerService.handleError(err);
        }
      });
    }
  }

  private formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }
}
