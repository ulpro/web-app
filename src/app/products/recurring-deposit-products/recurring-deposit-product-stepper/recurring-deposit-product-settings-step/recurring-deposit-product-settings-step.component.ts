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
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { MatDivider } from '@angular/material/divider';
import { MatStepperPrevious, MatStepperNext } from '@angular/material/stepper';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { ProductsService } from 'app/products/products.service';

@Component({
  selector: 'mifosx-recurring-deposit-product-settings-step',
  templateUrl: './recurring-deposit-product-settings-step.component.html',
  styleUrls: ['./recurring-deposit-product-settings-step.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCheckbox,
    MatTooltip,
    MatDivider,
    MatStepperPrevious,
    FaIconComponent,
    MatStepperNext
  ]
})
export class RecurringDepositProductSettingsStepComponent implements OnInit {
  private formBuilder = inject(UntypedFormBuilder);
  private productsService = inject(ProductsService);
  protected cdr = inject(ChangeDetectorRef);

  @Input() recurringDepositProductsTemplate: any;

  recurringDepositProductSettingsForm: UntypedFormGroup;

  kycTierOptions: any[] = [];
  lockinPeriodFrequencyTypeData: any;
  periodFrequencyTypeData: any;
  preClosurePenalInterestOnTypeData: any;
  taxGroupData: any;

  constructor() {
    this.createrecurringDepositProductSettingsForm();
    this.setConditionalControls();
  }

  ngOnInit() {
    this.lockinPeriodFrequencyTypeData = this.recurringDepositProductsTemplate.lockinPeriodFrequencyTypeOptions;
    this.periodFrequencyTypeData = this.recurringDepositProductsTemplate.periodFrequencyTypeOptions.slice(0, -1);
    this.preClosurePenalInterestOnTypeData = this.recurringDepositProductsTemplate.preClosurePenalInterestOnTypeOptions;
    this.taxGroupData = this.recurringDepositProductsTemplate.taxGroupOptions;

    this.kycTierOptions = this.recurringDepositProductsTemplate.kycTierOptions || [];
    if (!this.kycTierOptions || this.kycTierOptions.length === 0) {
      this.productsService.getKycTiers().subscribe((tiers: any) => {
        this.kycTierOptions = tiers || [];
      });
    }

    if (!(this.recurringDepositProductsTemplate === undefined) && this.recurringDepositProductsTemplate.id) {
      this.recurringDepositProductSettingsForm.patchValue({
        isMandatoryDeposit: this.recurringDepositProductsTemplate.isMandatoryDeposit,
        adjustAdvanceTowardsFuturePayments: this.recurringDepositProductsTemplate.adjustAdvanceTowardsFuturePayments,
        allowWithdrawal: this.recurringDepositProductsTemplate.allowWithdrawal,
        lockinPeriodFrequency: this.recurringDepositProductsTemplate.lockinPeriodFrequency,
        lockinPeriodFrequencyType: this.recurringDepositProductsTemplate.lockinPeriodFrequencyType
          ? this.recurringDepositProductsTemplate.lockinPeriodFrequencyType.id
          : '',
        minDepositTerm: this.recurringDepositProductsTemplate.minDepositTerm,
        minDepositTermTypeId: this.recurringDepositProductsTemplate.minDepositTermType
          ? this.recurringDepositProductsTemplate.minDepositTermType.id
          : '',
        inMultiplesOfDepositTerm: this.recurringDepositProductsTemplate.inMultiplesOfDepositTerm,
        inMultiplesOfDepositTermTypeId: this.recurringDepositProductsTemplate.inMultiplesOfDepositTermType
          ? this.recurringDepositProductsTemplate.inMultiplesOfDepositTerm.id
          : '',
        maxDepositTerm: this.recurringDepositProductsTemplate.maxDepositTerm,
        maxDepositTermTypeId: this.recurringDepositProductsTemplate.maxDepositTermType
          ? this.recurringDepositProductsTemplate.minDepositTermType.id
          : '',
        preClosurePenalApplicable: this.recurringDepositProductsTemplate.preClosurePenalApplicable,
        preClosurePenalInterest: this.recurringDepositProductsTemplate.preClosurePenalInterest,
        preClosurePenalInterestOnTypeId: this.recurringDepositProductsTemplate.preClosurePenalInterestOnType
          ? this.recurringDepositProductsTemplate.preClosurePenalInterestOnType.id
          : '',
        withHoldTax: this.recurringDepositProductsTemplate.withHoldTax
      });
    }

    const kycTier = this.recurringDepositProductsTemplate.kycTier || null;
    const kycTierId = kycTier ? kycTier.id : (this.recurringDepositProductsTemplate.kycTierId || null);
    if (kycTierId) {
      this.isKycRequired = true;
      this.recurringDepositProductSettingsForm.patchValue({
        requireKyc: true,
        kycTierId: Number(kycTierId)
      });
      this.recurringDepositProductSettingsForm.get('kycTierId')?.setValidators([Validators.required]);
      this.recurringDepositProductSettingsForm.get('kycTierId')?.updateValueAndValidity();
    }

    if (this.recurringDepositProductsTemplate.withHoldTax) {
      this.recurringDepositProductSettingsForm.patchValue({
        taxGroupId: this.recurringDepositProductsTemplate.taxGroup
          ? this.recurringDepositProductsTemplate.taxGroup.id
          : ''
      });
    }
  }

  createrecurringDepositProductSettingsForm() {
    this.recurringDepositProductSettingsForm = this.formBuilder.group({
      isMandatoryDeposit: [false],
      adjustAdvanceTowardsFuturePayments: [false],
      allowWithdrawal: [false],
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
    this.recurringDepositProductSettingsForm.get('requireKyc')?.valueChanges.subscribe((requireKyc: boolean) => {
      const kycTierIdControl = this.recurringDepositProductSettingsForm.get('kycTierId');
      if (requireKyc) {
        kycTierIdControl?.setValidators([Validators.required]);
      } else {
        kycTierIdControl?.clearValidators();
        kycTierIdControl?.setValue(null);
      }
      kycTierIdControl?.updateValueAndValidity();
    });

    this.recurringDepositProductSettingsForm.get('withHoldTax').valueChanges.subscribe((withHoldTax: any) => {
      if (withHoldTax) {
        this.recurringDepositProductSettingsForm.addControl(
          'taxGroupId',
          new UntypedFormControl('', Validators.required)
        );
      } else {
        this.recurringDepositProductSettingsForm.removeControl('taxGroupId');
      }
    });
  }

  isKycRequired: boolean = false;

  onRequireKycChange(event: any) {
    const isChecked = event.checked;
    this.recurringDepositProductSettingsForm.get('requireKyc')?.setValue(isChecked);
    const kycTierIdControl = this.recurringDepositProductSettingsForm.get('kycTierId');
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
    return !!this.recurringDepositProductSettingsForm.get('requireKyc')?.value;
  }

  get recurringDepositProductSettings() {
    const recurringDepositProductSettings = { ...this.recurringDepositProductSettingsForm.getRawValue() };
    const requireKyc = !!recurringDepositProductSettings.requireKyc;
    if (!requireKyc) {
      recurringDepositProductSettings.kycTierId = null;
    } else if (recurringDepositProductSettings.kycTierId) {
      recurringDepositProductSettings.kycTierId = Number(recurringDepositProductSettings.kycTierId);
    }
    delete recurringDepositProductSettings.requireKyc;
    for (const key in recurringDepositProductSettings) {
      if (recurringDepositProductSettings[key] === '') {
        delete recurringDepositProductSettings[key];
      }
    }
    return recurringDepositProductSettings;
  }
}
