import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { KycService } from '../../services/kyc.service';
import { ClientsService } from 'app/clients/clients.service';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { KycDashboardStatsData, KycCaseData } from '../../models/kyc.model';
import { Chart, registerables } from 'chart.js';
import { forkJoin, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';

Chart.register(...registerables);

@Component({
  standalone: false,
  selector: 'mifosx-kyc-dashboard',
  template: `
    <div class="kyc-dashboard">
      <!-- Header -->
      <div class="dash-header">
        <div>
          <h2 class="dash-title">KYC Command Center</h2>
          <p class="dash-subtitle">Real-time overview of your KYC operations</p>
        </div>
        <button mat-raised-button color="primary" (click)="loadData()" [disabled]="loading">
          <span class="refresh-icon" [class.spinning]="loading">&#x21bb;</span>
          Refresh
        </button>
      </div>

      <!-- 4 KPI Cards -->
      <div class="kpi-grid" *ngIf="stats">
        <div class="kpi-card">
          <fa-icon icon="folder-open" class="kpi-icon text-primary"></fa-icon>
          <div class="kpi-data">
            <div class="kpi-value">{{ stats.totalCases || 0 }}</div>
            <div class="kpi-label">TOTAL CASES</div>
          </div>
        </div>
        <div class="kpi-card">
          <fa-icon icon="file-alt" class="kpi-icon" style="color: #ff9800;"></fa-icon>
          <div class="kpi-data">
            <div class="kpi-value">{{ totalDocuments }}</div>
            <div class="kpi-label">TOTAL DOCUMENTS</div>
          </div>
        </div>
        <div class="kpi-card">
          <fa-icon icon="user-check" class="kpi-icon" style="color: #4caf50;"></fa-icon>
          <div class="kpi-data">
            <div class="kpi-value">{{ stats.assignedCases || 0 }}</div>
            <div class="kpi-label">ASSIGNED</div>
          </div>
        </div>
        <div class="kpi-card">
          <fa-icon icon="user-slash" class="kpi-icon" style="color: #9e9e9e;"></fa-icon>
          <div class="kpi-data">
            <div class="kpi-value">{{ stats.unassignedCases || 0 }}</div>
            <div class="kpi-label">UNASSIGNED</div>
          </div>
        </div>
      </div>

      <!-- Workflow Pipelines -->
      <div class="pipeline-grid">
        <!-- Case Workflow Pipeline -->
        <div class="modern-card">
          <h3 class="card-title">
            <fa-icon icon="project-diagram" class="m-r-10 text-primary"></fa-icon>
            Case Workflow Pipeline
          </h3>
          <div class="pipeline-bar" *ngIf="stats">
            <div class="pipeline-segment seg-pending">
              <span class="seg-count">{{ stats.initiatedCases || 0 }}</span>
              <span class="seg-label" title="Pending">Pending</span>
            </div>
            <div class="pipeline-segment seg-review">
              <span class="seg-count">{{ stats.docsReceivedCases || 0 }}</span>
              <span class="seg-label" title="In Review">Review</span>
            </div>
            <div class="pipeline-segment seg-compliant">
              <span class="seg-count">{{ stats.docsPendingCases || 0 }}</span>
              <span class="seg-label" title="Compliant">Compliant</span>
            </div>
            <div class="pipeline-segment seg-enhanced">
              <span class="seg-count">{{ stats.verificationInProgressCases || 0 }}</span>
              <span class="seg-label" title="Enhanced">Enhanced</span>
            </div>
            <div class="pipeline-segment seg-rejected">
              <span class="seg-count">{{ stats.pendingApprovalCases || 0 }}</span>
              <span class="seg-label" title="Rejected">Rejected</span>
            </div>
            <div class="pipeline-segment seg-closed">
              <span class="seg-count">{{ stats.approvedCases || 0 }}</span>
              <span class="seg-label" title="Closed">Closed</span>
            </div>
          </div>
        </div>

        <!-- Document Status Pipeline -->
        <div class="modern-card">
          <h3 class="card-title">
            <fa-icon icon="file-alt" class="m-r-10 text-primary"></fa-icon>
            Document Verification Pipeline
          </h3>
          <div class="pipeline-bar" *ngIf="docStatusCounts">
            <div class="pipeline-segment seg-pending">
              <span class="seg-count">{{ docStatusCounts.pending || 0 }}</span>
              <span class="seg-label" title="Pending">Pending</span>
            </div>
            <div class="pipeline-segment seg-review">
              <span class="seg-count">{{ docStatusCounts.underReview || 0 }}</span>
              <span class="seg-label" title="Under Review">Review</span>
            </div>
            <div class="pipeline-segment seg-compliant">
              <span class="seg-count">{{ docStatusCounts.verified || 0 }}</span>
              <span class="seg-label" title="Verified">Verified</span>
            </div>
            <div class="pipeline-segment seg-rejected">
              <span class="seg-count">{{ docStatusCounts.rejected || 0 }}</span>
              <span class="seg-label" title="Rejected">Rejected</span>
            </div>
            <div class="pipeline-segment seg-closed">
              <span class="seg-count">{{ docStatusCounts.expired || 0 }}</span>
              <span class="seg-label" title="Expired">Expired</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Layout -->
      <div class="main-grid">

        <!-- Left Column -->
        <div class="main-column">
          <!-- Tier by Client Type Chart -->
          <div class="modern-card">
            <h3 class="card-title">
              <fa-icon icon="chart-bar" class="m-r-10 text-primary"></fa-icon>
              Tier Distribution by Client Type
            </h3>
            <div class="chart-container">
              <canvas id="tier-chart"></canvas>
            </div>
          </div>

          <!-- Expired Documents -->
          <div class="modern-card">
            <h3 class="card-title">
              <fa-icon icon="exclamation-triangle" class="m-r-10" style="color: #f44336;"></fa-icon>
              Expired Documents
            </h3>
            <div class="table-container" *ngIf="expiredDocuments.length > 0">
              <table class="modern-table">
                <thead>
                  <tr>
                    <th>CLIENT</th>
                    <th>DOCUMENT TYPE</th>
                    <th>EXPIRY DATE</th>
                    <th class="text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let doc of expiredDocuments">
                    <td class="font-500">{{ doc.clientName }}</td>
                    <td>{{ doc.documentTypeName }}</td>
                    <td class="text-secondary">{{ doc.expiryDateFormatted }}</td>
                    <td class="text-right">
                      <a mat-button color="primary" [routerLink]="['/kyc/cases', doc.caseId]">VIEW CASE</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="empty-state" *ngIf="expiredDocuments.length === 0">
              <fa-icon icon="check-circle" class="empty-icon text-success"></fa-icon>
              <p>No expired documents found.</p>
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div class="sidebar-column">


          <!-- Recent KYC Cases -->
          <div class="modern-card">
            <h3 class="card-title">
              <fa-icon icon="clock" class="m-r-10 text-primary"></fa-icon>
              Recent Cases
            </h3>
            <div class="activity-list" *ngIf="!loadingActivity; else loadingTpl">
              <div class="activity-item" *ngFor="let act of recentActivity" [routerLink]="['/kyc/cases', act.caseId]">
                <div class="activity-info">
                  <span class="act-client">{{ act.clientName }}</span>
                  <span class="act-status">{{ act.action }}</span>
                </div>
                <div class="activity-meta">
                  <span class="act-date">{{ act.relativeTime }}</span>
                </div>
              </div>
              <div class="empty-state-sm" *ngIf="recentActivity.length === 0">
                <p>No recent activity.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ng-template #loadingTpl>
        <div class="loading-state">
          <span class="spinner-inline">&#x21bb;</span> Loading...
        </div>
      </ng-template>

    </div>
  `,
  styles: [`
    .kyc-dashboard {
      padding: 24px;
      min-height: 100vh;
      color: var(--mat-sys-on-surface);
      background: var(--mat-sys-surface-variant);
    }

    .text-primary { color: var(--mat-sys-primary); }
    .text-success { color: #4caf50; }
    .text-secondary { color: var(--mat-sys-on-surface-variant); font-size: 13px; }
    .font-500 { font-weight: 500; }
    .m-r-10 { margin-right: 10px; }

    /* Header */
    .dash-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 24px;
    }
    .dash-title {
      font-size: 24px; font-weight: 500; margin: 0;
      color: var(--mat-sys-on-surface);
    }
    .dash-subtitle {
      font-size: 14px; margin: 4px 0 0;
      color: var(--mat-sys-on-surface-variant);
    }

    .refresh-icon { display: inline-block; margin-right: 8px; }
    .refresh-icon.spinning { animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* KPI Grid (4 cards) */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    @media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .kpi-grid { grid-template-columns: 1fr; } }

    .kpi-card {
      background: #ffffff;
      border: 1px solid var(--mat-sys-outline-variant);
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      border-radius: 8px;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      height: 100px;
      box-sizing: border-box;
    }
    .kpi-icon { font-size: 24px; flex-shrink: 0; }
    .kpi-data { display: flex; flex-direction: column; }
    .kpi-value {
      font-size: 32px; font-weight: 600; line-height: 1.2;
      color: var(--mat-sys-on-surface);
    }
    .kpi-label {
      font-size: 12px; font-weight: 500; margin-top: 4px;
      color: var(--mat-sys-on-surface-variant);
      text-transform: uppercase; letter-spacing: 0.5px;
    }

    /* Pipeline Grid */
    .pipeline-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    @media (max-width: 1024px) { .pipeline-grid { grid-template-columns: 1fr; } }

    /* Pipeline Bar */
    .pipeline-bar {
      display: flex;
      height: 48px;
      border-radius: 6px;
      overflow: hidden;
      margin-top: 16px;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .pipeline-segment {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 0;
      flex: 1;
      padding: 0 4px;
    }
    .seg-count { font-size: 16px; font-weight: 700; line-height: 1; margin-bottom: 2px; }
    .seg-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

    .seg-pending { background: #f5f5f5; color: #757575; }
    .seg-review { background: #fff3e0; color: #ef6c00; }
    .seg-compliant { background: #e8f5e9; color: #2e7d32; }
    .seg-enhanced { background: #e3f2fd; color: #1565c0; }
    .seg-rejected { background: #ffebee; color: #c62828; }
    .seg-closed { background: #eceff1; color: #455a64; }

    /* Modern Card */
    .modern-card {
      background: #ffffff;
      border: 1px solid var(--mat-sys-outline-variant);
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      border-radius: 8px;
      padding: 20px 24px;
    }
    .card-title {
      font-size: 16px; font-weight: 500; margin: 0 0 20px;
      display: flex; align-items: center;
      color: var(--mat-sys-on-surface);
    }

    /* Main Grid */
    .main-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }
    @media (max-width: 1024px) { .main-grid { grid-template-columns: 1fr; } }

    .main-column { display: flex; flex-direction: column; gap: 24px; }
    .sidebar-column { display: flex; flex-direction: column; gap: 24px; }

    /* Chart */
    .chart-container { position: relative; height: 280px; width: 100%; }

    /* Table */
    .table-container { width: 100%; overflow-x: auto; }
    .modern-table { width: 100%; border-collapse: collapse; text-align: left; }
    .modern-table th {
      font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;
      color: var(--mat-sys-on-surface-variant);
      padding: 12px 16px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .modern-table td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      font-size: 14px;
      color: var(--mat-sys-on-surface);
    }
    .modern-table tr:hover td {
      background: var(--mat-sys-surface-variant);
      transition: background 0.15s ease;
    }
    .text-right { text-align: right !important; }

    /* Assignment Overview */
    .assignment-overview { display: flex; flex-direction: column; }
    .assign-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .assign-row:last-child { border-bottom: none; }
    .assign-label { font-size: 14px; color: var(--mat-sys-on-surface); font-weight: 500; }
    .assign-value { font-size: 20px; font-weight: 600; }

    /* Activity List */
    .activity-list { display: flex; flex-direction: column; }
    .activity-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      cursor: pointer;
    }
    .activity-item:last-child { border-bottom: none; }
    .activity-item:hover { background: var(--mat-sys-surface-variant); border-radius: 4px; padding-left: 8px; padding-right: 8px; margin: 0 -8px; }
    .activity-info { display: flex; flex-direction: column; }
    .act-client { font-weight: 500; font-size: 14px; color: var(--mat-sys-on-surface); }
    .act-status { font-size: 13px; color: var(--mat-sys-on-surface-variant); margin-top: 2px; }
    .activity-meta { display: flex; align-items: flex-end; }
    .act-date { font-size: 12px; color: var(--mat-sys-on-surface-variant); }

    /* States */
    .empty-state { text-align: center; padding: 40px 16px; }
    .empty-icon { font-size: 32px; opacity: 0.5; display: block; margin-bottom: 12px; }
    .empty-state p { font-size: 14px; margin: 0; color: var(--mat-sys-on-surface-variant); }
    .empty-state-sm { text-align: center; padding: 20px; color: var(--mat-sys-on-surface-variant); font-size: 13px; }
    .loading-state {
      display: flex; align-items: center; justify-content: center;
      padding: 40px; font-size: 14px; color: var(--mat-sys-on-surface-variant);
    }
    .spinner-inline { display: inline-block; margin-right: 8px; animation: spin .8s linear infinite; }
  `]
})
export class KycDashboardComponent implements OnInit, OnDestroy {
  private kycService = inject(KycService);
  private clientsService = inject(ClientsService);
  private authenticationService = inject(AuthenticationService);

  stats: KycDashboardStatsData;
  loading = false;

  // Dashboard data
  tierChart: any;
  totalDocuments = 0;
  docStatusCounts: { pending: number; underReview: number; verified: number; rejected: number; expired: number } | null = null;
  expiredDocuments: any[] = [];
  recentActivity: any[] = [];
  loadingActivity = false;

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    if (this.tierChart) {
      this.tierChart.destroy();
    }
  }

  loadData() {
    this.loading = true;
    this.loadingActivity = true;

    forkJoin({
      stats: this.kycService.getDashboardStats(),
      casesPage: this.kycService.getCases({ limit: 1000 }),
      clientsPage: this.clientsService.getClients('id', 'asc', 0, 1000),
      tiers: this.kycService.getTiers()
    }).pipe(
      switchMap((res: any) => {
        const allCases: KycCaseData[] = res.casesPage?.pageItems ? res.casesPage.pageItems : (Array.isArray(res.casesPage) ? res.casesPage : []);
        const clientIds = Array.from(new Set(allCases.map(c => c.clientId).filter(id => !!id)));
        
        if (clientIds.length === 0) {
          return of({ ...res, allDocuments: [] });
        }
        
        const docRequests = clientIds.map(id => this.kycService.getClientDocuments(id).pipe(catchError(() => of([]))));
        return forkJoin(docRequests).pipe(
          map(docsArrays => {
            const allDocs = [].concat(...(docsArrays as any[]));
            return { ...res, allDocuments: allDocs };
          })
        );
      })
    ).subscribe({
      next: (res: any) => {
        let allCases: KycCaseData[] = res.casesPage?.pageItems
          ? res.casesPage.pageItems
          : (Array.isArray(res.casesPage) ? res.casesPage : []);
        const allClients: any[] = res.clientsPage?.pageItems
          ? res.clientsPage.pageItems
          : (Array.isArray(res.clientsPage) ? res.clientsPage : []);
        const allDocs: any[] = Array.isArray(res.allDocuments) ? res.allDocuments : [];
        const tiersList: any[] = res.tiers || [];

        // Data Scoping logic
        const creds = this.authenticationService.getCredentials();
        const currentOfficeId = creds ? creds.officeId : null;
        const clientOfficeIdMap = new Map<number, number>();
        allClients.forEach((cl: any) => {
           if (cl.id && cl.officeId) clientOfficeIdMap.set(cl.id, cl.officeId);
        });

        allCases = allCases.filter((item: any) => {
             const clientOfficeId = clientOfficeIdMap.get(item.clientId);
             if (!clientOfficeId) return false;
             if (currentOfficeId && currentOfficeId !== 1) {
                 return clientOfficeId === currentOfficeId;
             }
             return true;
        });

        // Recalculate stats based on filtered cases
        this.stats = {
           totalCases: allCases.length,
           assignedCases: allCases.filter(c => c.assignedAgentId).length,
           unassignedCases: allCases.filter(c => !c.assignedAgentId).length,
           initiatedCases: allCases.filter(c => c.workflowStatusId === 100).length,
           docsReceivedCases: allCases.filter(c => c.workflowStatusId === 200).length,
           docsPendingCases: allCases.filter(c => c.workflowStatusId === 300).length,
           verificationInProgressCases: allCases.filter(c => c.workflowStatusId === 400).length,
           pendingApprovalCases: allCases.filter(c => c.workflowStatusId === 500).length,
           approvedCases: allCases.filter(c => c.workflowStatusId === 600).length
        } as any;

        // Map tier names to cases for chart
        allCases.forEach(c => {
          const tId = c.tier?.id || (c as any).tierId;
          if (tId) {
            const matched = tiersList.find(t => t.id === tId);
            if (matched) {
              c.tier = { id: matched.id, name: matched.name };
            }
          }
        });

        // Total documents count
        this.totalDocuments = allDocs.length;

        // Build document status pipeline
        this.buildDocStatusCounts(allDocs);

        // Build tier distribution chart
        this.buildTierByClientTypeChart(allCases, allClients);

        // Build expired documents list
        this.buildExpiredDocuments(allDocs, allCases);

        // Build recent activity
        this.buildRecentActivity(allCases);

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading KYC Dashboard data', err);
        this.loading = false;
        this.loadingActivity = false;
      }
    });
  }

  buildDocStatusCounts(allDocs: any[]) {
    const counts = { pending: 0, underReview: 0, verified: 0, rejected: 0, expired: 0 };
    allDocs.forEach((doc: any) => {
      const statusId = doc.verificationStatus?.id || doc.verificationStatus;
      if (statusId === 100) counts.pending++;
      else if (statusId === 200) counts.underReview++;
      else if (statusId === 300) counts.verified++;
      else if (statusId === 400) counts.rejected++;
      else if (statusId === 500) counts.expired++;
      else counts.pending++; // default
    });
    this.docStatusCounts = counts;
  }

  buildTierByClientTypeChart(allCases: KycCaseData[], allClients: any[]) {
    const clientTypeMap = new Map<number, string>();
    allClients.forEach((cl: any) => {
      if (cl.id && cl.clientType?.name) {
        clientTypeMap.set(cl.id, cl.clientType.name);
      }
    });

    // Collect unique tiers and client types
    const tiersSet = new Set<string>();
    const clientTypesSet = new Set<string>();

    allCases.forEach((c: any) => {
      const tierName = c.tier?.name || 'No Tier';
      const clientType = clientTypeMap.get(c.clientId) || 'Individual';
      tiersSet.add(tierName);
      clientTypesSet.add(clientType);
    });

    const tierNames = Array.from(tiersSet);
    const clientTypes = Array.from(clientTypesSet);

    // Build matrix: for each client type, count per tier
    const counts: { [type: string]: { [tier: string]: number } } = {};
    clientTypes.forEach(t => {
      counts[t] = {};
      tierNames.forEach(tier => { counts[t][tier] = 0; });
    });

    allCases.forEach((c: any) => {
      const tierName = c.tier?.name || 'No Tier';
      const clientType = clientTypeMap.get(c.clientId) || 'Individual';
      if (counts[clientType] && counts[clientType][tierName] !== undefined) {
        counts[clientType][tierName]++;
      }
    });

    const colors = ['#2196f3', '#4caf50', '#ff9800', '#9e9e9e', '#607d8b', '#9c27b0'];
    const datasets = clientTypes.map((type, idx) => ({
      label: type,
      data: tierNames.map(tier => counts[type][tier] || 0),
      backgroundColor: colors[idx % colors.length],
      borderRadius: 4
    }));

    setTimeout(() => {
      const ctx = document.getElementById('tier-chart') as HTMLCanvasElement;
      if (ctx) {
        if (this.tierChart) {
          this.tierChart.destroy();
        }
        this.tierChart = new Chart(ctx, {
          type: 'bar',
          data: { labels: tierNames, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { stacked: true, grid: { display: false } },
              y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
            },
            plugins: {
              legend: {
                position: 'bottom',
                labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } }
              }
            }
          }
        });
      }
    }, 0);
  }

  buildExpiredDocuments(allDocs: any[], allCases: KycCaseData[]) {
    const now = new Date();
    const caseMap = new Map<number, KycCaseData>();
    allCases.forEach(c => caseMap.set(c.clientId, c));

    this.expiredDocuments = [];

    allDocs.forEach((doc: any) => {
      if (doc.expiryDate) {
        let expDate: Date;
        if (Array.isArray(doc.expiryDate)) {
          const [y, m, d] = doc.expiryDate;
          expDate = new Date(y, m - 1, d);
        } else {
          expDate = new Date(doc.expiryDate);
        }

        if (expDate < now) {
          const kycCase = caseMap.get(doc.clientId);
          this.expiredDocuments.push({
            clientName: kycCase?.clientName || `Client #${doc.clientId}`,
            documentTypeName: doc.documentTypeName || 'Unknown',
            expiryDateFormatted: expDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            caseId: kycCase?.id
          });
        }
      }
    });
  }

  buildRecentActivity(allCases: KycCaseData[]) {
    // Filter cases that actually exist and sort by most recently modified
    const validCases = allCases.filter(c => c && c.id);
    const sortedCases = validCases.sort((a: any, b: any) => {
      const dateA = this.parseDateToTime(a.lastModifiedDate || a.createdDate);
      const dateB = this.parseDateToTime(b.lastModifiedDate || b.createdDate);
      return dateB - dateA;
    }).slice(0, 8);

    this.recentActivity = sortedCases.map(c => {
      const timeMs = this.parseDateToTime(c.lastModifiedDate || c.createdDate);
      const date = timeMs > 0 ? new Date(timeMs) : new Date();
      return {
        caseId: c.id,
        clientName: c.clientName || `Client #${c.clientId}`,
        action: c.workflowStatusValue || 'Pending',
        relativeTime: timeMs > 0 ? this.getRelativeTimeString(date) : 'Recently'
      };
    });

    this.loadingActivity = false;
  }

  parseDateToTime(dateVal: any): number {
    if (!dateVal) return 0;
    if (Array.isArray(dateVal)) {
      if (dateVal.length >= 3) {
        return new Date(dateVal[0], dateVal[1] - 1, dateVal[2], dateVal[3] || 0, dateVal[4] || 0, dateVal[5] || 0).getTime();
      }
    }
    return new Date(dateVal).getTime();
  }

  getRelativeTimeString(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }
}
