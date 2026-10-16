/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit, Input, inject, ChangeDetectorRef } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDivider } from '@angular/material/divider';
import { MatStepperPrevious, MatStepperNext } from '@angular/material/stepper';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { ProductsService } from 'app/products/products.service';

@Component({
  selector: 'mifosx-share-product-settings-step',
  templateUrl: './share-product-settings-step.component.html',
  styleUrls: ['./share-product-settings-step.component.scss'],
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
export class ShareProductSettingsStepComponent implements OnInit {
  private formBuilder = inject(UntypedFormBuilder);
  private productsService = inject(ProductsService);
  protected cdr = inject(ChangeDetectorRef);

  @Input() shareProductsTemplate: any;

  shareProductSettingsForm: UntypedFormGroup;

  kycTierOptions: any[] = [];
  minimumActivePeriodFrequencyTypeData: any;
  lockinPeriodFrequencyTypeData: any;

  constructor() {
    this.createShareProductSettingsForm();
    this.setConditionalControls();
  }

  ngOnInit() {
    this.minimumActivePeriodFrequencyTypeData = this.shareProductsTemplate.minimumActivePeriodFrequencyTypeOptions;
    this.lockinPeriodFrequencyTypeData = this.shareProductsTemplate.lockinPeriodFrequencyTypeOptions;

    this.kycTierOptions = this.shareProductsTemplate.kycTierOptions || [];
    if (!this.kycTierOptions || this.kycTierOptions.length === 0) {
      this.productsService.getKycTiers().subscribe((tiers: any) => {
        this.kycTierOptions = tiers || [];
      });
    }

    this.shareProductSettingsForm.patchValue({
      minimumShares: this.shareProductsTemplate.minimumShares,
      nominalShares: this.shareProductsTemplate.nominalShares,
      maximumShares: this.shareProductsTemplate.maximumShares,
      minimumActivePeriodForDividends: this.shareProductsTemplate.minimumActivePeriod,
      minimumactiveperiodFrequencyType:
        this.shareProductsTemplate.minimumActivePeriodForDividendsTypeEnum &&
        this.shareProductsTemplate.minimumActivePeriodForDividendsTypeEnum.id,
      lockinPeriodFrequency: this.shareProductsTemplate.lockinPeriod,
      lockinPeriodFrequencyType:
        this.shareProductsTemplate.lockPeriodTypeEnum && this.shareProductsTemplate.lockPeriodTypeEnum.id,
      allowDividendCalculationForInactiveClients: this.shareProductsTemplate.allowDividendCalculationForInactiveClients
    });

    const kycTier = this.shareProductsTemplate.kycTier || null;
    const kycTierId = kycTier ? kycTier.id : (this.shareProductsTemplate.kycTierId || null);
    if (kycTierId) {
      this.isKycRequired = true;
      this.shareProductSettingsForm.patchValue({
        requireKyc: true,
        kycTierId: Number(kycTierId)
      });
      this.shareProductSettingsForm.get('kycTierId')?.setValidators([Validators.required]);
      this.shareProductSettingsForm.get('kycTierId')?.updateValueAndValidity();
    }
  }

  createShareProductSettingsForm() {
    this.shareProductSettingsForm = this.formBuilder.group(
      {
        minimumShares: [
          '',
          [
            Validators.required,
            Validators.min(1),
            Validators.pattern(/^[0-9]+$/)
          ]
        ],
        nominalShares: [
          '',
          [
            Validators.required,
            Validators.min(1),
            Validators.pattern(/^[0-9]+$/)
          ]
        ],
        maximumShares: [
          '',
          [
            Validators.required,
            Validators.min(1),
            Validators.pattern(/^[0-9]+$/)
          ]
        ],
        minimumActivePeriodForDividends: [
          '',
          [
            Validators.required,
            Validators.min(1),
            Validators.pattern(/^[0-9]+$/)
          ]
        ],
        minimumactiveperiodFrequencyType: [''],
        lockinPeriodFrequency: [''],
        lockinPeriodFrequencyType: [''],
        allowDividendCalculationForInactiveClients: [false],
        requireKyc: [false],
        kycTierId: [null]
      },
      {
        validators: this.validateSharesOrder
      }
    );
  }

  setConditionalControls() {
    this.shareProductSettingsForm.get('requireKyc')?.valueChanges.subscribe((requireKyc: boolean) => {
      const kycTierIdControl = this.shareProductSettingsForm.get('kycTierId');
      if (requireKyc) {
        kycTierIdControl?.setValidators([Validators.required]);
      } else {
        kycTierIdControl?.clearValidators();
        kycTierIdControl?.setValue(null);
      }
      kycTierIdControl?.updateValueAndValidity();
    });
  }

  private validateSharesOrder(group: UntypedFormGroup): { [key: string]: any } | null {
    const min = Number(group.get('minimumShares')?.value);
    const nominal = Number(group.get('nominalShares')?.value);
    const max = Number(group.get('maximumShares')?.value);
    if (min && nominal && max) {
      if (min > nominal || nominal > max) {
        return { sharesOrder: true };
      }
    }
    return null;
  }

  isKycRequired: boolean = false;

  onRequireKycChange(event: any) {
    const isChecked = event.checked;
    this.shareProductSettingsForm.get('requireKyc')?.setValue(isChecked);
    const kycTierIdControl = this.shareProductSettingsForm.get('kycTierId');
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
    return !!this.shareProductSettingsForm.get('requireKyc')?.value;
  }

  get shareProductSettings() {
    const formValue = { ...this.shareProductSettingsForm.getRawValue() };
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
