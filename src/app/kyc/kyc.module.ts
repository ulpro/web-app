/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { NgModule } from '@angular/core';

import { KycRoutingModule } from './kyc-routing.module';
import { SharedModule } from 'app/shared/shared.module';

import { KycShellComponent } from './pages/kyc-shell/kyc-shell.component';
import { KycDashboardComponent } from './pages/dashboard/dashboard.component';
import { ApprovalQueueComponent } from './pages/approval-queue/approval-queue.component';
import { CaseListComponent } from './pages/cases/case-list/case-list.component';
import { KycConfigurationComponent } from './pages/configuration/configuration.component';
import { CaseDetailComponent } from './pages/cases/case-detail/case-detail.component';
import { DocumentTypesComponent } from './pages/configuration/document-types.component';
import { TiersComponent } from './pages/configuration/tiers.component';
import { ProcessKycDocumentDialogComponent } from './pages/approval-queue/process-kyc-document-dialog/process-kyc-document-dialog.component';
import { CreateDocumentTypeDialogComponent } from './pages/configuration/create-document-type-dialog/create-document-type-dialog.component';
import { EditTierComponent } from './pages/configuration/tiers/edit-tier/edit-tier.component';
import { CreateTierComponent } from './pages/configuration/tiers/create-tier/create-tier.component';
import { ViewTierComponent } from './pages/configuration/tiers/view-tier/view-tier.component';
import { ReviewsWorkspaceComponent } from './pages/reviews/reviews-workspace.component';
import { ComplianceQueuePageComponent } from './pages/compliance-queue/compliance-queue-page.component';
import { AuditCenterPageComponent } from './pages/audit-center/audit-center-page.component';

/**
 * KYC Module
 *
 * All components related to KYC should be declared here.
 */
@NgModule({
  declarations: [
    KycShellComponent,
    KycDashboardComponent,
    ApprovalQueueComponent,
    KycConfigurationComponent,
    DocumentTypesComponent,
    TiersComponent,
    ProcessKycDocumentDialogComponent,
    CreateDocumentTypeDialogComponent,
    EditTierComponent,
    CreateTierComponent,
    ViewTierComponent,
    ReviewsWorkspaceComponent,
    ComplianceQueuePageComponent,
    AuditCenterPageComponent
  ],
  imports: [
    SharedModule,
    KycRoutingModule,
    CaseListComponent,
    CaseDetailComponent
  ],
  providers: []
})
export class KycModule {}
