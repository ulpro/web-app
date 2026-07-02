import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { KycService } from '../../services/kyc.service';
import { KycCaseData } from '../../models/kyc.model';

@Component({
  standalone: false,
  selector: 'mifosx-compliance-queue-page',
  template: `
    <div class="compliance-page">

      <div class="page-header">
        <div>
          <h2 class="page-title">Compliance Queue</h2>
          <p class="page-subtitle">Cases pending final approval or rejection</p>
        </div>
        <button class="refresh-btn" (click)="loadCases()">
          <span class="refresh-icon" [class.spinning]="loading">&#x21bb;</span> Refresh
        </button>
      </div>

      <div class="queue-count" *ngIf="cases.length > 0">
        <span class="count-badge">{{ cases.length }}</span> case(s) awaiting decision
      </div>

      <div class="queue-list" *ngIf="cases.length > 0">
        <div class="queue-card" *ngFor="let c of cases">
          <div class="q-left">
            <span class="q-avatar">{{ getInitials(c.clientName) }}</span>
            <div class="q-info">
              <span class="q-name">{{ c.clientName }}</span>
              <span class="q-meta">Case #{{ c.id }} &middot; 
                <ng-container *ngIf="c.requiredDocumentCount > 0; else noReq">{{ c.submittedDocumentCount }}/{{ c.requiredDocumentCount }}</ng-container>
                <ng-template #noReq>{{ c.submittedDocumentCount }}</ng-template> docs 
                &middot; Agent: {{ c.assignedAgentName || 'None' }}</span>
            </div>
          </div>
          <div class="q-tier" *ngIf="c.tier?.name">
            <span class="tier-tag">{{ c.tier.name }}</span>
          </div>
          <div class="q-risk" *ngIf="c.riskLevelValue">
            <span class="risk-tag" [ngClass]="'rt-' + c.riskLevelCode?.toLowerCase()">{{ c.riskLevelValue }}</span>
          </div>
          <div class="q-actions">
            <button class="action-btn approve-btn" (click)="approve(c)" [disabled]="c._processing" matTooltip="Approve this case">
              &#x2705; Approve
            </button>
            <button class="action-btn reject-btn" (click)="confirmReject(c)" [disabled]="c._processing" matTooltip="Reject this case">
              &#x274C; Reject
            </button>
            <a class="action-btn view-btn" [routerLink]="['/kyc/cases', c.id]" matTooltip="View details">
              Details &#x2192;
            </a>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="cases.length === 0 && !loading">
        <span class="empty-icon">&#x2705;</span>
        <p>No cases pending approval. All clear!</p>
      </div>

    </div>
  `,
  styles: [`
    .compliance-page { padding: 0; }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;
    }
    .page-title { font-size: 24px; font-weight: 700; color: #1a1a2e; margin: 0; }
    .page-subtitle { color: #6b7280; font-size: 14px; margin: 4px 0 0; }
    .refresh-btn {
      display: flex; align-items: center; gap: 6px; padding: 8px 18px;
      border-radius: 8px; border: 1px solid #d1d5db; background: #fff;
      cursor: pointer; font-size: 13px; color: #374151; transition: all .2s;
    }
    .refresh-btn:hover { background: #f3f4f6; }
    .refresh-icon { font-size: 16px; display: inline-block; }
    .refresh-icon.spinning { animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .queue-count {
      margin-bottom: 16px; font-size: 14px; color: #6b7280;
      display: flex; align-items: center; gap: 8px;
    }
    .count-badge {
      background: #f59e0b; color: #fff; padding: 2px 10px; border-radius: 12px;
      font-weight: 700; font-size: 13px;
    }

    .queue-list { display: flex; flex-direction: column; gap: 12px; }
    .queue-card {
      display: flex; align-items: center; justify-content: space-between;
      background: #fff; border-radius: 14px; padding: 20px 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06); border: 1px solid #f3f4f6;
      transition: box-shadow .2s; flex-wrap: wrap; gap: 12px;
    }
    .queue-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }

    .q-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 200px; }
    .q-avatar {
      width: 42px; height: 42px; border-radius: 10px;
      background: linear-gradient(135deg, #f59e0b, #f97316);
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 600;
    }
    .q-info { display: flex; flex-direction: column; }
    .q-name { font-size: 15px; font-weight: 600; color: #1a1a2e; }
    .q-meta { font-size: 12px; color: #9ca3af; margin-top: 2px; }

    .tier-tag {
      padding: 4px 12px; border-radius: 8px; font-size: 11px; font-weight: 600;
      background: #eef2ff; color: #6366f1;
    }

    .risk-tag {
      padding: 3px 10px; border-radius: 8px; font-size: 11px; font-weight: 600;
    }
    .rt-low { background: #d1fae5; color: #059669; }
    .rt-medium { background: #fef3c7; color: #d97706; }
    .rt-high, .rt-critical { background: #fee2e2; color: #dc2626; }

    .q-actions { display: flex; gap: 8px; align-items: center; }
    .action-btn {
      padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500;
      border: none; cursor: pointer; transition: all .2s; text-decoration: none;
      display: inline-flex; align-items: center; gap: 4px;
    }
    .approve-btn { background: #d1fae5; color: #059669; }
    .approve-btn:hover { background: #a7f3d0; }
    .reject-btn { background: #fee2e2; color: #dc2626; }
    .reject-btn:hover { background: #fecaca; }
    .view-btn { background: #f3f4f6; color: #374151; }
    .view-btn:hover { background: #e5e7eb; }
    .action-btn:disabled { opacity: .5; cursor: not-allowed; }

    .empty-state { text-align: center; padding: 60px 20px; color: #9ca3af; }
    .empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }
  `]
})
export class ComplianceQueuePageComponent implements OnInit {
  private kycService = inject(KycService);
  cases: any[] = [];
  loading = false;

  ngOnInit() { this.loadCases(); }

  loadCases() {
    this.loading = true;
    this.kycService.getCases().subscribe({
      next: (data: any) => {
        const items = data?.pageItems ? data.pageItems : (Array.isArray(data) ? data : []);
        // Compliance queue shows only cases pending approval (status 500)
        this.cases = items
          .filter((c: KycCaseData) => c.workflowStatusId === 500)
          .map((c: any) => ({ ...c, _processing: false }));
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  approve(c: any) {
    c._processing = true;
    this.kycService.transitionWorkflow(c.id, 600, 'Approved from compliance queue').subscribe({
      next: () => this.loadCases(),
      error: () => c._processing = false
    });
  }

  confirmReject(c: any) {
    const confirmed = window.confirm(
      `Are you sure you want to REJECT the KYC case for "${c.clientName}" (Case #${c.id})?\n\nThis action is irreversible.`
    );
    if (confirmed) {
      this.reject(c);
    }
  }

  private reject(c: any) {
    c._processing = true;
    this.kycService.transitionWorkflow(c.id, 700, 'Rejected from compliance queue').subscribe({
      next: () => this.loadCases(),
      error: () => c._processing = false
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.trim().split(/\s+/).map(p => p.charAt(0).toUpperCase()).slice(0, 2).join('');
  }
}
