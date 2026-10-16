/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductsService } from '../../../products.service';
import { Accounting } from 'app/core/utils/accounting';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { MatDivider } from '@angular/material/divider';
import {
  MatTable,
  MatColumnDef,
  MatHeaderCellDef,
  MatHeaderCell,
  MatCellDef,
  MatCell,
  MatHeaderRowDef,
  MatHeaderRow,
  MatRowDef,
  MatRow
} from '@angular/material/table';
import { ViewSavingsAccountingDetailsComponent } from '../../../../shared/accounting/view-savings-accounting-details/view-savings-accounting-details.component';
import { FormatNumberPipe } from '../../../../pipes/format-number.pipe';
import { YesnoPipe } from '../../../../pipes/yesno.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

@Component({
  selector: 'mifosx-saving-product-general-tab',
  templateUrl: './saving-product-general-tab.component.html',
  styleUrls: ['./saving-product-general-tab.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    MatDivider,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    ViewSavingsAccountingDetailsComponent,
    FormatNumberPipe,
    YesnoPipe
  ]
})
export class SavingProductGeneralTabComponent {
  private route = inject(ActivatedRoute);
  private accounting = inject(Accounting);
  private productsService = inject(ProductsService);

  savingProduct: any;
  kycTierOptions: any[] = [];

  chargesDisplayedColumns: string[] = [
    'name',
    'chargeCalculationType',
    'amount',
    'chargeTimeType'
  ];
  paymentFundSourceDisplayedColumns: string[] = [
    'paymentTypeId',
    'fundSourceAccountId'
  ];
  feesPenaltyIncomeDisplayedColumns: string[] = [
    'chargeId',
    'incomeAccountId'
  ];

  get kycTierName(): string | null {
    if (this.savingProduct?.kycTier?.name) {
      return this.savingProduct.kycTier.name;
    }
    if ((this.savingProduct as any)?.kycTierName) {
      return (this.savingProduct as any).kycTierName;
    }
    const kycTierId = (this.savingProduct as any)?.kycTierId;
    if (kycTierId) {
      const options = this.kycTierOptions || [];
      const tier = options.find((t: any) => String(t.id) === String(kycTierId));
      if (tier) {
        return tier.name;
      }
    }
    return null;
  }

  constructor() {
    this.route.data.subscribe((data: { savingProduct: any }) => {
      this.savingProduct = data.savingProduct;
    });
    this.productsService.getKycTiers().subscribe((tiers: any) => {
      this.kycTierOptions = tiers || [];
    });
  }

  isCashOrAccrualAccounting(): boolean {
    return this.accounting.isCashOrAccrualAccounting(this.savingProduct.accountingRule);
  }

  isAccrualAccounting(): boolean {
    return this.accounting.isAccrualAccounting(this.savingProduct.accountingRule);
  }
}
