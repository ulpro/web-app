import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

import { KycService } from '../../../../services/kyc.service';
import { KycDocumentType, KycTier, KycDocumentRequirement, AVAILABLE_KYC_FIELDS } from '../../../../models/kyc.model';

@Component({
  standalone: false,
  selector: 'mifosx-edit-tier',
  templateUrl: './edit-tier.component.html',
  styleUrls: ['./edit-tier.component.scss']
})
export class EditTierComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private kycService = inject(KycService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  tierForm: FormGroup;
  documentTypes: KycDocumentType[] = [];
  tierId: number;
  isLoading = true;
  availableKycFields = AVAILABLE_KYC_FIELDS;

  ngOnInit() {
    this.createTierForm();
    
    // We use forkJoin to ensure documentTypes are loaded before patching the tier values.
    // This prevents Angular Material mat-select from losing selected values due to a race condition.
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.tierId = +id;
        
        forkJoin({
          docs: this.kycService.getDocumentTypes(),
          tier: this.kycService.getTier(id)
        }).subscribe({
          next: (results: any) => {
            this.documentTypes = results.docs;
            
            const data = results.tier;
            const selectedDocTypeIds = (data.documentRequirements || []).map(
              (req: any) => req.documentTypeId
            );
            const selectedRequiredFields = (data.requiredFields || []).map(
              (req: any) => req.fieldName || req
            );
            
            this.tierForm.patchValue({
              name: data.name,
              description: data.description,
              level: data.level,
              validityDays: data.validityDays,
              maxBalance: data.maxBalance,
              maxTransactionAmount: data.maxTransactionAmount,
              active: data.active,
              selectedDocumentTypes: selectedDocTypeIds,
              requiredFields: selectedRequiredFields
            });
            this.isLoading = false;
          },
          error: (err: any) => {
            console.error('Error fetching tier data', err);
            this.isLoading = false;
          }
        });
      }
    });
  }

  createTierForm() {
    this.tierForm = this.formBuilder.group({
      // code non modifiable via PUT (SUPPORTED_UPDATE_PARAMETERS ne l'inclut pas)
      name: ['', Validators.required],
      description: [''],
      level: [null, [Validators.required, Validators.min(1)]],
      validityDays: [null, [Validators.min(1)]],
      maxBalance: [null],
      maxTransactionAmount: [null],
      active: [true],
      selectedDocumentTypes: [[]],
      requiredFields: [[]]
    });
  }

  loadDocumentTypes() {
    // Left empty for compatibility if called elsewhere, but now handled in forkJoin
  }

  submit() {
    if (this.tierForm.valid) {
      const formValue = this.tierForm.value;

      const documentRequirements: KycDocumentRequirement[] = (formValue.selectedDocumentTypes || []).map(
        (id: number) => ({ documentTypeId: id, mandatory: true })
      );

      // PUT n'accepte pas "code" (SUPPORTED_UPDATE_PARAMETERS)
      const tierUpdate: Partial<KycTier> = {
        name: formValue.name,
        description: formValue.description || undefined,
        level: formValue.level,
        validityDays: formValue.validityDays || undefined,
        maxBalance: formValue.maxBalance || undefined,
        maxTransactionAmount: formValue.maxTransactionAmount || undefined,
        active: formValue.active,
        documentRequirements: documentRequirements,
        requiredFields: formValue.requiredFields || [],
        locale: 'en'   // requis par Fineract pour parser level (integerValueOfParameterNamed) et BigDecimal
      };

      this.kycService.updateTier(this.tierId, tierUpdate).subscribe({
        next: () => {
          this.router.navigate(['../../'], { relativeTo: this.route });
        },
        error: (err: any) => {
          console.error('Error updating tier', err);
        }
      });
    }
  }
}
