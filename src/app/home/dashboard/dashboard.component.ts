/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, OnInit, inject } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { activities } from '../activities';
import { MatAutocompleteTrigger, MatAutocomplete } from '@angular/material/autocomplete';
import { AsyncPipe } from '@angular/common';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { DashboardEngineComponent } from 'app/analytics/dashboard-engine/dashboard-engine.component';
import { GLOBAL_ANALYTICS_DASHBOARD } from 'app/analytics/global-dashboard.config';
import { KycService } from 'app/kyc/services/kyc.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { RouterModule } from '@angular/router';

/**
 * Dashboard component.
 */
@Component({
  selector: 'mifosx-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatAutocompleteTrigger,
    MatAutocomplete,
    DashboardEngineComponent,
    AsyncPipe,
    FaIconComponent,
    RouterModule
  ]
})
export class DashboardComponent implements OnInit {
  private route = inject(ActivatedRoute);

  /** Search Text. */
  searchText: UntypedFormControl = new UntypedFormControl();
  /** Filtered Activities. */
  filteredActivities!: Observable<any[]>;
  /** All User Activities. */
  allActivities: any[] = activities;
  /** Dashboard definition */
  dashboardDefinition = GLOBAL_ANALYTICS_DASHBOARD;
  /** Office options from resolver */
  offices: any[] = [];

  /** KYC Quick Stats */
  pendingKyc: number = 0;
  eddKyc: number = 0;
  private kycService = inject(KycService);

  constructor() {
    this.route.data.subscribe((data: { offices: any[] }) => {
      this.offices = data.offices || [];
    });
  }

  ngOnInit() {
    this.setFilteredActivities();
    this.fetchKycSummary();
  }

  fetchKycSummary() {
    this.kycService.getCases().subscribe(data => {
      const cases = data?.pageItems || data || [];
      this.pendingKyc = cases.filter((c: any) => c.workflowStatusCode === 'EN_ATTENTE' || c.workflowStatusCode === 'EN_REVISION').length;
      this.eddKyc = cases.filter((c: any) => c.workflowStatusCode === 'RENFORCE').length;
    });
  }

  /**
   * Sets filtered activities for autocomplete.
   */
  setFilteredActivities() {
    this.filteredActivities = this.searchText.valueChanges.pipe(
      map((activity: any) => (typeof activity === 'string' ? activity : activity.activity)),
      map((activityName: string) => (activityName ? this.filterActivity(activityName) : this.allActivities))
    );
  }

  /**
   * Filters activities.
   * @param activityName Activity name to filter activity by.
   * @returns {any} Filtered activities.
   */
  private filterActivity(activityName: string): any {
    const filterValue = activityName.toLowerCase();
    return this.allActivities.filter((activity) => activity.activity.toLowerCase().indexOf(filterValue) === 0);
  }
}
