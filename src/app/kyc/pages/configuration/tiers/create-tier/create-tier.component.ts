import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { KycService } from '../../../../services/kyc.service';
import { KycDocumentType, KycTier, KycDocumentRequirement, AVAILABLE_KYC_FIELDS } from '../../../../models/kyc.model';

@Component({
  standalone: false,
  selector: 'mifosx-create-tier',
  templateUrl: './create-tier.component.html',
  styleUrls: ['./create-tier.component.scss']
})
export class CreateTierComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private kycService = inject(KycService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  tierForm: FormGroup;
  documentTypes: KycDocumentType[] = [];
  availableKycFields = AVAILABLE_KYC_FIELDS;

  ngOnInit() {
    this.createTierForm();
    this.loadDocumentTypes();
  }

  createTierForm() {
    this.tierForm = this.formBuilder.group({
      code: ['', Validators.required],                          // Obligatoire (unique)
      name: ['', Validators.required],                          // Obligatoire
      description: [''],                                        // Optionnel
      level: [null, [Validators.required, Validators.min(1)]], // Obligatoire (Integer > 0)
      validityDays: [null, [Validators.min(1)]],                // Optionnel (Integer > 0)
      maxBalance: [null],                                       // BigDecimal optionnel
      maxTransactionAmount: [null],                             // BigDecimal optionnel
      active: [true],
      // documentRequirements est géré via un multi-select et construit dans submit()
      selectedDocumentTypes: [[]],
      requiredFields: [[]]
    });
  }

  loadDocumentTypes() {
    this.kycService.getDocumentTypes().subscribe({
      next: (docs: KycDocumentType[]) => {
        this.documentTypes = docs.filter((d: KycDocumentType) => d.active !== false);
      },
      error: (err: any) => console.error('Error fetching document types', err)
    });
  }

  submit() {
    if (this.tierForm.valid) {
      const formValue = this.tierForm.value;

      // Construire le payload selon KycTierValidator.SUPPORTED_CREATE_PARAMETERS
      const documentRequirements: KycDocumentRequirement[] = (formValue.selectedDocumentTypes || []).map(
        (id: number) => ({ documentTypeId: id, mandatory: true })
      );

      const tier: KycTier = {
        code: formValue.code,
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

      this.kycService.createTier(tier).subscribe({
        next: () => {
          this.router.navigate(['../'], { relativeTo: this.route });
        },
        error: (err: any) => {
          console.error('Error creating tier', err);
        }
      });
    }
  }
}
