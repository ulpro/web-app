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
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDivider } from '@angular/material/divider';
import { MatStepperPrevious, MatStepperNext } from '@angular/material/stepper';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { ProductsService } from 'app/products/products.service';

@Component({
  selector: 'mifosx-saving-product-settings-step',
  templateUrl: './saving-product-settings-step.component.html',
  styleUrls: ['./saving-product-settings-step.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatTooltip,
    MatCheckbox,
    MatDivider,
    MatStepperPrevious,
    FaIconComponent,
    MatStepperNext
  ]
})
export class SavingProductSettingsStepComponent implements OnInit {
  private formBuilder = inject(UntypedFormBuilder);
  private productsService = inject(ProductsService);
  protected cdr = inject(ChangeDetectorRef);

  @Input() savingProductsTemplate: any;

  savingProductSettingsForm: UntypedFormGroup;

  kycTierOptions: any[] = [];
  lockinPeriodFrequencyTypeData: any;
  taxGroupData: any;

  constructor() {
    this.createSavingProductSettingsForm();
    this.setConditionalControls();
  }

  ngOnInit() {
    this.lockinPeriodFrequencyTypeData = this.savingProductsTemplate.lockinPeriodFrequencyTypeOptions;
    this.taxGroupData = this.savingProductsTemplate.taxGroupOptions;

    this.kycTierOptions = this.savingProductsTemplate.kycTierOptions || [];
    if (!this.kycTierOptions || this.kycTierOptions.length === 0) {
      this.productsService.getKycTiers().subscribe((tiers: any) => {
        this.kycTierOptions = tiers || [];
      });
    }

    const hasLockinPeriod =
      this.savingProductsTemplate.lockinPeriodFrequency && this.savingProductsTemplate.lockinPeriodFrequency > 0;

    this.savingProductSettingsForm.patchValue({
      minRequiredOpeningBalance: this.savingProductsTemplate.minRequiredOpeningBalance,
      enableLockinPeriod: hasLockinPeriod,
      withdrawalFeeForTransfers: this.savingProductsTemplate.withdrawalFeeForTransfers,
      minBalanceForInterestCalculation: this.savingProductsTemplate.minBalanceForInterestCalculation,
      enforceMinRequiredBalance: this.savingProductsTemplate.enforceMinRequiredBalance,
      minRequiredBalance: this.savingProductsTemplate.minRequiredBalance,
      allowOverdraft: this.savingProductsTemplate.allowOverdraft,
      minOverdraftForInterestCalculation: this.savingProductsTemplate.minOverdraftForInterestCalculation,
      nominalAnnualInterestRateOverdraft: this.savingProductsTemplate.nominalAnnualInterestRateOverdraft,
      overdraftLimit: this.savingProductsTemplate.overdraftLimit,
      withHoldTax: this.savingProductsTemplate.withHoldTax,
      taxGroupId: this.savingProductsTemplate.taxGroup && this.savingProductsTemplate.taxGroup.id,
      isDormancyTrackingActive: this.savingProductsTemplate.isDormancyTrackingActive,
      daysToInactive: this.savingProductsTemplate.daysToInactive,
      daysToDormancy: this.savingProductsTemplate.daysToDormancy,
      daysToEscheat: this.savingProductsTemplate.daysToEscheat
    });

    const kycTier = this.savingProductsTemplate.kycTier || null;
    const kycTierId = kycTier ? kycTier.id : (this.savingProductsTemplate.kycTierId || null);
    if (kycTierId) {
      this.isKycRequired = true;
      this.savingProductSettingsForm.patchValue({
        requireKyc: true,
        kycTierId: Number(kycTierId)
      });
      this.savingProductSettingsForm.get('kycTierId')?.setValidators([Validators.required]);
      this.savingProductSettingsForm.get('kycTierId')?.updateValueAndValidity();
    }

    if (hasLockinPeriod) {
      this.savingProductSettingsForm.patchValue({
        lockinPeriodFrequency: this.savingProductsTemplate.lockinPeriodFrequency,
        lockinPeriodFrequencyType:
          this.savingProductsTemplate.lockinPeriodFrequencyType &&
          this.savingProductsTemplate.lockinPeriodFrequencyType.id
      });
    }
  }

  createSavingProductSettingsForm() {
    this.savingProductSettingsForm = this.formBuilder.group({
      minRequiredOpeningBalance: [
        '',
        [Validators.min(0)]
      ],
      enableLockinPeriod: [false],
      withdrawalFeeForTransfers: [false],
      minBalanceForInterestCalculation: [
        '',
        [Validators.min(0)]
      ],
      enforceMinRequiredBalance: [false],
      minRequiredBalance: [
        '',
        [Validators.min(0)]
      ],
      allowOverdraft: [false],
      withHoldTax: [false],
      isDormancyTrackingActive: [false],
      requireKyc: [false],
      kycTierId: [null]
    });
  }

  setConditionalControls() {
    this.savingProductSettingsForm.get('requireKyc')?.valueChanges.subscribe((requireKyc: boolean) => {
      const kycTierIdControl = this.savingProductSettingsForm.get('kycTierId');
      if (requireKyc) {
        kycTierIdControl?.setValidators([Validators.required]);
      } else {
        kycTierIdControl?.clearValidators();
        kycTierIdControl?.setValue(null);
      }
      kycTierIdControl?.updateValueAndValidity();
    });

    this.savingProductSettingsForm.get('enableLockinPeriod').valueChanges.subscribe((enableLockinPeriod: any) => {
      if (enableLockinPeriod) {
        this.savingProductSettingsForm.addControl(
          'lockinPeriodFrequency',
          new UntypedFormControl('', [
            Validators.required,
            Validators.min(1),
            Validators.pattern('^[1-9]\\d*$')
          ])
        );
        this.savingProductSettingsForm.addControl(
          'lockinPeriodFrequencyType',
          new UntypedFormControl('', Validators.required)
        );
      } else {
        this.savingProductSettingsForm.removeControl('lockinPeriodFrequency');
        this.savingProductSettingsForm.removeControl('lockinPeriodFrequencyType');
      }
    });

    this.savingProductSettingsForm.get('allowOverdraft').valueChanges.subscribe((allowOverdraft: any) => {
      if (allowOverdraft) {
        this.savingProductSettingsForm.addControl(
          'minOverdraftForInterestCalculation',
          new UntypedFormControl('', [Validators.min(0)])
        );
        this.savingProductSettingsForm.addControl(
          'nominalAnnualInterestRateOverdraft',
          new UntypedFormControl('', [Validators.min(0)])
        );
        this.savingProductSettingsForm.addControl('overdraftLimit', new UntypedFormControl('', [Validators.min(0)]));
      } else {
        this.savingProductSettingsForm.removeControl('minOverdraftForInterestCalculation');
        this.savingProductSettingsForm.removeControl('nominalAnnualInterestRateOverdraft');
        this.savingProductSettingsForm.removeControl('overdraftLimit');
      }
    });

    this.savingProductSettingsForm.get('withHoldTax').valueChanges.subscribe((withHoldTax: any) => {
      if (withHoldTax) {
        this.savingProductSettingsForm.addControl('taxGroupId', new UntypedFormControl('', Validators.required));
      } else {
        this.savingProductSettingsForm.removeControl('taxGroupId');
      }
    });

    this.savingProductSettingsForm
      .get('isDormancyTrackingActive')
      .valueChanges.subscribe((isDormancyTrackingActive: any) => {
        if (isDormancyTrackingActive) {
          this.savingProductSettingsForm.addControl(
            'daysToInactive',
            new UntypedFormControl('', [
              Validators.required,
              Validators.min(0)
            ])
          );
          this.savingProductSettingsForm.addControl(
            'daysToDormancy',
            new UntypedFormControl('', [
              Validators.required,
              Validators.min(0)
            ])
          );
          this.savingProductSettingsForm.addControl(
            'daysToEscheat',
            new UntypedFormControl('', [
              Validators.required,
              Validators.min(0)
            ])
          );
        } else {
          this.savingProductSettingsForm.removeControl('daysToInactive');
          this.savingProductSettingsForm.removeControl('daysToDormancy');
          this.savingProductSettingsForm.removeControl('daysToEscheat');
        }
      });
  }

  isKycRequired: boolean = false;

  onRequireKycChange(event: any) {
    const isChecked = event.checked;
    this.savingProductSettingsForm.get('requireKyc')?.setValue(isChecked);
    const kycTierIdControl = this.savingProductSettingsForm.get('kycTierId');
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
    return !!this.savingProductSettingsForm.get('requireKyc')?.value;
  }

  get savingProductSettings() {
    const formValue = { ...this.savingProductSettingsForm.getRawValue() };
    delete formValue.enableLockinPeriod;
    const requireKyc = !!formValue.requireKyc;
    if (!requireKyc) {
      formValue.kycTierId = null;
    } else if (formValue.kycTierId) {
      formValue.kycTierId = Number(formValue.kycTierId);
    }
    delete formValue.requireKyc;
    return formValue;
  }
}
