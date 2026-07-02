import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { KycService } from '../../../services/kyc.service';
import { KycDocumentType } from '../../../models/kyc.model';
import { TranslateModule } from '@ngx-translate/core';

import { AlertService } from '../../../../core/alert/alert.service';

@Component({
  standalone: false,
  selector: 'mifosx-create-document-type-dialog',
  templateUrl: './create-document-type-dialog.component.html',
  styleUrls: ['./create-document-type-dialog.component.scss']
})
export class CreateDocumentTypeDialogComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CreateDocumentTypeDialogComponent>);
  private kycService = inject(KycService);
  private alertService = inject(AlertService);

  documentTypeForm: FormGroup;

  ngOnInit() {
    this.createDocumentTypeForm();
  }

  createDocumentTypeForm() {
    this.documentTypeForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
      active: [true]
    });
  }

  submit() {
    if (this.documentTypeForm.valid) {
      const formValue = this.documentTypeForm.value;
      const documentType: KycDocumentType = {
        ...formValue,
        code: formValue.name ? formValue.name.toUpperCase().trim().replace(/[\s-]+/g, '_').replace(/[^A-Z0-9_]/g, '') : ''
      };

      this.kycService.createDocumentType(documentType).subscribe({
        next: (response) => {
          this.alertService.alert({
            type: 'Success',
            message: 'Document Type created successfully.'
          });
          this.dialogRef.close(true); // Indicate success
        },
        error: (error) => {
          // Extract Fineract error message if possible
          const errorMsg = error.error?.developerMessage || error.error?.defaultUserMessage || 'Error creating Document Type';
          this.alertService.alert({
            type: 'Error',
            message: errorMsg
          });
          console.error('Error creating Document Type', error);
        }
      });
    }
  }
}
