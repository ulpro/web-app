/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { Route } from '../core/route/route.service';

import { KycShellComponent } from './pages/kyc-shell/kyc-shell.component';
import { KycConfigurationComponent } from './pages/configuration/configuration.component';
import { TiersComponent } from './pages/configuration/tiers.component';
import { CreateTierComponent } from './pages/configuration/tiers/create-tier/create-tier.component';
import { ViewTierComponent } from './pages/configuration/tiers/view-tier/view-tier.component';
import { EditTierComponent } from './pages/configuration/tiers/edit-tier/edit-tier.component';
import { DocumentTypesComponent } from './pages/configuration/document-types.component';

import { KycDashboardComponent } from './pages/dashboard/dashboard.component';
import { CaseListComponent } from './pages/cases/case-list/case-list.component';
import { CaseDetailComponent } from './pages/cases/case-detail/case-detail.component';
import { ReviewsWorkspaceComponent } from './pages/reviews/reviews-workspace.component';
import { ComplianceQueuePageComponent } from './pages/compliance-queue/compliance-queue-page.component';
import { AuditCenterPageComponent } from './pages/audit-center/audit-center-page.component';

const routes: Routes = [
  Route.withShell([
    {
      path: 'kyc',
      component: KycShellComponent,
      children: [
        { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
        {
          path: 'dashboard',
          component: KycDashboardComponent,
          data: { title: 'KYC Dashboard', breadcrumb: 'Dashboard' }
        },
        {
          path: 'cases',
          data: { title: 'KYC Cases', breadcrumb: 'Cases' },
          children: [
            { path: '', component: CaseListComponent },
            { path: ':caseId', component: CaseDetailComponent, data: { title: 'KYC Case Detail', routeParamBreadcrumb: 'caseId' } }
          ]
        },
        {
          path: 'edd-cases',
          component: CaseListComponent,
          data: { title: 'Enhanced Due Diligence Cases', statusFilter: 400, breadcrumb: 'EDD Cases' }
        },
        {
          path: 'reviews',
          component: ReviewsWorkspaceComponent,
          data: { title: 'KYC Reviews', breadcrumb: 'Reviews' }
        },
        {
          path: 'compliance-queue',
          component: ComplianceQueuePageComponent,
          data: { title: 'Compliance Queue', breadcrumb: 'Compliance Queue' }
        },
        {
          path: 'audit',
          component: AuditCenterPageComponent,
          data: { title: 'Audit Center', breadcrumb: 'Audit Center' }
        },
        {
          path: 'configuration',
          component: KycConfigurationComponent,
          data: { title: 'KYC Configuration', breadcrumb: 'Configuration' },
          children: [
            { path: '', redirectTo: 'document-types', pathMatch: 'full' },
            {
              path: 'document-types',
              component: DocumentTypesComponent,
              data: { title: 'Manage KYC Document Types', breadcrumb: 'Document Types' }
            },
            {
              path: 'tiers',
              data: { title: 'Manage KYC Tiers', breadcrumb: 'Tiers' },
              children: [
                {
                  path: '',
                  component: TiersComponent
                },
                {
                  path: 'create',
                  component: CreateTierComponent,
                  data: { title: 'Create KYC Tier', breadcrumb: 'Create' }
                },
                {
                  path: ':id',
                  data: { title: 'View KYC Tier', routeParamBreadcrumb: 'id' },
                  children: [
                    {
                      path: '',
                      component: ViewTierComponent
                    },
                    {
                      path: 'edit',
                      component: EditTierComponent,
                      data: { title: 'Edit KYC Tier', breadcrumb: 'Edit', routeParamBreadcrumb: false }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ])
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class KycRoutingModule {}
