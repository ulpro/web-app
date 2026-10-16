/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit, Input, inject, ChangeDetectorRef } from '@angular/core';
import {
  UntypedFormGroup,
  UntypedFormBuilder,
  UntypedFormControl,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { MatTooltip } from '@angular/material/tooltip';
import { MatDivider } from '@angular/material/divider';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatStepperPrevious, MatStepperNext } from '@angular/material/stepper';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { ProductsService } from 'app/products/products.service';

@Component({
  selector: 'mifosx-fixed-deposit-product-settings-step',
  templateUrl: './fixed-deposit-product-settings-step.component.html',
  styleUrls: ['./fixed-deposit-product-settings-step.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatTooltip,
    MatDivider,
    MatCheckbox,
    MatStepperPrevious,
    FaIconComponent,
    MatStepperNext
  ]
})
export class FixedDepositProductSettingsStepComponent implements OnInit {
  private formBuilder = inject(UntypedFormBuilder);
  private productsService = inject(ProductsService);
  protected cdr = inject(ChangeDetectorRef);

  @Input() fixedDepositProductsTemplate: any;

  fixedDepositProductSettingsForm: UntypedFormGroup;

  kycTierOptions: any[] = [];
  lockinPeriodFrequencyTypeData: any;
  periodFrequencyTypeData: any;
  preClosurePenalInterestOnTypeData: any;
  taxGroupData: any;

  constructor() {
    this.createFixedDepositProductSettingsForm();
    this.setConditionalControls();
  }

  ngOnInit() {
    this.lockinPeriodFrequencyTypeData = this.fixedDepositProductsTemplate.lockinPeriodFrequencyTypeOptions;
    this.periodFrequencyTypeData = this.fixedDepositProductsTemplate.periodFrequencyTypeOptions.slice(0, -1);
    this.preClosurePenalInterestOnTypeData = this.fixedDepositProductsTemplate.preClosurePenalInterestOnTypeOptions;
    this.taxGroupData = this.fixedDepositProductsTemplate.taxGroupOptions;

    this.kycTierOptions = this.fixedDepositProductsTemplate.kycTierOptions || [];
    if (!this.kycTierOptions || this.kycTierOptions.length === 0) {
      this.productsService.getKycTiers().subscribe((tiers: any) => {
        this.kycTierOptions = tiers || [];
      });
    }

    if (!(this.fixedDepositProductsTemplate === undefined) && this.fixedDepositProductsTemplate.id) {
      this.fixedDepositProductSettingsForm.patchValue({
        isMandatoryDeposit: this.fixedDepositProductsTemplate.isMandatoryDeposit,
        adjustAdvanceTowardsFuturePayments: this.fixedDepositProductsTemplate.adjustAdvanceTowardsFuturePayments,
        allowWithdrawal: this.fixedDepositProductsTemplate.allowWithdrawal,
        lockinPeriodFrequency: this.fixedDepositProductsTemplate.lockinPeriodFrequency,
        lockinPeriodFrequencyType: this.fixedDepositProductsTemplate.lockinPeriodFrequencyType
          ? this.fixedDepositProductsTemplate.lockinPeriodFrequencyType.id
          : '',
        minDepositTerm: this.fixedDepositProductsTemplate.minDepositTerm,
        minDepositTermTypeId: this.fixedDepositProductsTemplate.minDepositTermType
          ? this.fixedDepositProductsTemplate.minDepositTermType.id
          : '',
        inMultiplesOfDepositTerm: this.fixedDepositProductsTemplate.inMultiplesOfDepositTerm,
        inMultiplesOfDepositTermTypeId: this.fixedDepositProductsTemplate.inMultiplesOfDepositTermType
          ? this.fixedDepositProductsTemplate.inMultiplesOfDepositTerm.id
          : '',
        maxDepositTerm: this.fixedDepositProductsTemplate.maxDepositTerm,
        maxDepositTermTypeId: this.fixedDepositProductsTemplate.maxDepositTermType
          ? this.fixedDepositProductsTemplate.minDepositTermType.id
          : '',
        preClosurePenalApplicable: this.fixedDepositProductsTemplate.preClosurePenalApplicable,
        preClosurePenalInterest: this.fixedDepositProductsTemplate.preClosurePenalInterest,
        preClosurePenalInterestOnTypeId: this.fixedDepositProductsTemplate.preClosurePenalInterestOnType
          ? this.fixedDepositProductsTemplate.preClosurePenalInterestOnType.id
          : '',
        withHoldTax: this.fixedDepositProductsTemplate.withHoldTax
      });
    }

    const kycTier = this.fixedDepositProductsTemplate.kycTier || null;
    const kycTierId = kycTier ? kycTier.id : (this.fixedDepositProductsTemplate.kycTierId || null);
    if (kycTierId) {
      this.isKycRequired = true;
      this.fixedDepositProductSettingsForm.patchValue({
        requireKyc: true,
        kycTierId: Number(kycTierId)
      });
      this.fixedDepositProductSettingsForm.get('kycTierId')?.setValidators([Validators.required]);
      this.fixedDepositProductSettingsForm.get('kycTierId')?.updateValueAndValidity();
    }

    if (this.fixedDepositProductsTemplate.withHoldTax) {
      this.fixedDepositProductSettingsForm.patchValue({
        taxGroupId: this.fixedDepositProductsTemplate.taxGroup ? this.fixedDepositProductsTemplate.taxGroup.id : ''
      });
    }
  }

  createFixedDepositProductSettingsForm() {
    this.fixedDepositProductSettingsForm = this.formBuilder.group({
      lockinPeriodFrequency: [
        '',
        Validators.min(0)
      ],
      lockinPeriodFrequencyType: [''],
      minDepositTerm: [
        '',
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      minDepositTermTypeId: [
        '',
        Validators.required
      ],
      inMultiplesOfDepositTerm: [
        '',
        Validators.min(0)
      ],
      inMultiplesOfDepositTermTypeId: [''],
      maxDepositTerm: [
        '',
        Validators.min(0)
      ],
      maxDepositTermTypeId: [''],
      preClosurePenalApplicable: [false],
      preClosurePenalInterest: [
        '',
        Validators.min(0)
      ],
      preClosurePenalInterestOnTypeId: [''],
      withHoldTax: [false],
      requireKyc: [false],
      kycTierId: [null]
    });
  }

  setConditionalControls() {
    this.fixedDepositProductSettingsForm.get('requireKyc')?.valueChanges.subscribe((requireKyc: boolean) => {
      const kycTierIdControl = this.fixedDepositProductSettingsForm.get('kycTierId');
      if (requireKyc) {
        kycTierIdControl?.setValidators([Validators.required]);
      } else {
        kycTierIdControl?.clearValidators();
        kycTierIdControl?.setValue(null);
      }
      kycTierIdControl?.updateValueAndValidity();
    });

    this.fixedDepositProductSettingsForm.get('withHoldTax').valueChanges.subscribe((withHoldTax: any) => {
      if (withHoldTax) {
        this.fixedDepositProductSettingsForm.addControl('taxGroupId', new UntypedFormControl('', Validators.required));
      } else {
        this.fixedDepositProductSettingsForm.removeControl('taxGroupId');
      }
    });
  }

  isKycRequired: boolean = false;

  onRequireKycChange(event: any) {
    const isChecked = event.checked;
    this.fixedDepositProductSettingsForm.get('requireKyc')?.setValue(isChecked);
    const kycTierIdControl = this.fixedDepositProductSettingsForm.get('kycTierId');
    if (isChecked) {
      kycTierIdControl?.setValidators([Validators.required]);
      if (!kycTierIdControl?.value && this.kycTierOptions?.length > 0) {
        kycTierIdControl?.setValue(this.kycTierOptions[0].id);
      }
    } else {
      kycTierIdControl?.clearValidators();
      kycTierIdControl?.setValue(null);
    }
    kycTierIdControl?.updateValueAndValidity({ emitEvent: false });
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  compareKycTiers(o1: any, o2: any): boolean {
    if (o1 === o2) return true;
    if (o1 == null || o2 == null) return false;
    return String(o1) === String(o2);
  }

  get requireKyc(): boolean {
    return !!this.fixedDepositProductSettingsForm.get('requireKyc')?.value;
  }

  get fixedDepositProductSettings() {
    const fixedDepositProductSettings = { ...this.fixedDepositProductSettingsForm.getRawValue() };
    const requireKyc = !!fixedDepositProductSettings.requireKyc;
    if (!requireKyc) {
      fixedDepositProductSettings.kycTierId = null;
    } else if (fixedDepositProductSettings.kycTierId) {
      fixedDepositProductSettings.kycTierId = Number(fixedDepositProductSettings.kycTierId);
    }
    delete fixedDepositProductSettings.requireKyc;
    for (const key in fixedDepositProductSettings) {
      if (fixedDepositProductSettings[key] === '') {
        delete fixedDepositProductSettings[key];
      }
    }
    return fixedDepositProductSettings;
  }
}
