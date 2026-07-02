import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { KycService } from '../../services/kyc.service';
import { KycCaseData } from '../../models/kyc.model';

@Component({
  standalone: false,
  selector: 'mifosx-reviews-workspace',
  template: `
    <div class="reviews-page">

      <div class="page-header">
        <div>
          <h2 class="page-title">Reviews Workspace</h2>
          <p class="page-subtitle">Cases awaiting document verification and review</p>
        </div>
        <div class="header-actions">
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Filter by Status</mat-label>
            <mat-select [(value)]="statusFilter" (selectionChange)="applyFilter()">
              <mat-option value="all">All In-Progress</mat-option>
              <mat-option value="100">Pending</mat-option>
              <mat-option value="200">Under Review</mat-option>
              <mat-option value="300">Compliant</mat-option>
              <mat-option value="400">Non-Compliant (EDD)</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-icon-button color="primary" (click)="loadCases()" matTooltip="Refresh">
            <fa-icon icon="sync"></fa-icon>
          </button>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="stats-bar">
        <div class="stat-chip" *ngFor="let s of statusCounts">
          <span class="chip-dot" [style.background]="s.color"></span>
          <span class="chip-label">{{ s.label }}</span>
          <span class="chip-count">{{ s.count }}</span>
        </div>
      </div>

      <!-- Cases Grid -->
      <div class="cases-grid" *ngIf="filteredCases.length > 0">
        <div class="case-card" *ngFor="let c of filteredCases" [routerLink]="['/kyc/cases', c.id]">
          <div class="card-top">
            <div class="client-info">
              <span class="client-avatar">{{ getInitials(c.clientName) }}</span>
              <div>
                <span class="client-name">{{ c.clientName }}</span>
                <span class="case-id">Case #{{ c.id }}</span>
              </div>
            </div>
            <span class="status-pill" [ngClass]="'ws-' + c.workflowStatusCode?.toLowerCase()">
              {{ c.workflowStatusValue }}
            </span>
          </div>

          <div class="card-body">
            <div class="card-row">
              <span class="card-label">Tier</span>
              <span class="card-value tier-value" *ngIf="c.tier?.name">
                <fa-icon icon="layer-group" class="m-r-5 text-primary"></fa-icon>{{ c.tier.name }}
              </span>
              <span class="card-value text-muted" *ngIf="!c.tier?.name">None</span>
            </div>
            <div class="card-row">
              <span class="card-label">Documents</span>
              <span class="card-value">{{ c.submittedDocumentCount }}/{{ c.requiredDocumentCount }}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" [style.width.%]="c.completionPercentage"></div>
            </div>
            <div class="card-row">
              <span class="card-label">Agent</span>
              <span class="card-value">{{ c.assignedAgentName || 'Unassigned' }}</span>
            </div>
            <div class="card-row" *ngIf="c.riskLevelValue">
              <span class="card-label">Risk</span>
              <span class="card-value risk" [ngClass]="'risk-' + c.riskLevelCode?.toLowerCase()">{{ c.riskLevelValue }}</span>
            </div>
          </div>

          <div class="card-footer">
            <span class="card-date">{{ c.createdDate | date:'mediumDate' }}</span>
            <span class="card-arrow">&#x2192;</span>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="filteredCases.length === 0 && !loading">
        <span class="empty-icon">&#x1F4CB;</span>
        <p>No cases matching this filter.</p>
      </div>

    </div>
  `,
  styles: [`
    .reviews-page { padding: 0; }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 20px;
    }
    .page-title { font-size: 24px; font-weight: 700; color: #1a1a2e; margin: 0; }
    .page-subtitle { color: #6b7280; font-size: 14px; margin: 4px 0 0; }
    .header-actions { display: flex; align-items: center; gap: 12px; }
    .filter-field { width: 200px; }
    ::ng-deep .filter-field .mat-mdc-form-field-subscript-wrapper { display: none; }

    /* Stats Bar */
    .stats-bar {
      display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;
    }
    .stat-chip {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px; border-radius: 20px;
      background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.06);
      font-size: 13px;
    }
    .chip-dot { width: 8px; height: 8px; border-radius: 50%; }
    .chip-label { color: #6b7280; }
    .chip-count { font-weight: 700; color: #1a1a2e; }

    /* Grid */
    .cases-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }
    .case-card {
      background: #fff; border-radius: 14px; padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.03);
      cursor: pointer; transition: transform .2s, box-shadow .2s;
      border: 1px solid #f3f4f6;
    }
    .case-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(0,0,0,.1);
      border-color: #e5e7eb;
    }

    .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .client-info { display: flex; align-items: center; gap: 12px; }
    .client-avatar {
      width: 40px; height: 40px; border-radius: 10px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 600;
    }
    .client-name { font-size: 15px; font-weight: 600; color: #1a1a2e; display: block; }
    .case-id { font-size: 12px; color: #9ca3af; }

    .status-pill {
      padding: 4px 12px; border-radius: 20px; font-size: 11px;
      font-weight: 600; text-transform: uppercase; letter-spacing: .3px;
    }
    .ws-initiated, .ws-docs_pending { background: #f3f4f6; color: #6b7280; }
    .ws-docs_received { background: #dbeafe; color: #2563eb; }
    .ws-verification_in_progress { background: #ede9fe; color: #7c3aed; }
    .ws-en_attente { background: #f1f5f9; color: #475569; }
    .ws-conforme { background: #d1fae5; color: #059669; }
    .ws-en_revision { background: #fef3c7; color: #d97706; }
    .ws-renforce { background: #fee2e2; color: #dc2626; }

    .card-body { display: flex; flex-direction: column; gap: 8px; }
    .card-row { display: flex; justify-content: space-between; align-items: center; }
    .card-label { font-size: 13px; color: #9ca3af; }
    .card-value { font-size: 13px; font-weight: 500; color: #374151; }
    .tier-value { color: #6366f1; font-weight: 600; }
    .text-primary { color: #6366f1; }
    .text-muted { color: #9ca3af; }
    .m-r-5 { margin-right: 5px; }
    .risk-low { color: #10b981; }
    .risk-medium { color: #f59e0b; }
    .risk-high, .risk-critical { color: #ef4444; font-weight: 700; }

    .progress-track {
      height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;
    }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 2px; transition: width .3s; }

    .card-footer {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f4f6;
    }
    .card-date { font-size: 12px; color: #9ca3af; }
    .card-arrow { font-size: 16px; color: #6366f1; }

    .empty-state { text-align: center; padding: 60px 20px; color: #9ca3af; }
    .empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }
  `]
})
export class ReviewsWorkspaceComponent implements OnInit {
  private kycService = inject(KycService);
  allCases: KycCaseData[] = [];
  filteredCases: KycCaseData[] = [];
  statusFilter = 'all';
  loading = false;

  statusCounts: { label: string; count: number; color: string }[] = [];

  // Statuses that belong in the "reviews" phase (pre-approval)
  private reviewStatuses = [100, 200, 300, 400];

  ngOnInit() {
    this.loadCases();
  }

  loadCases() {
    this.loading = true;
    this.kycService.getCases().subscribe({
      next: (data: any) => {
        const items = data?.pageItems ? data.pageItems : (Array.isArray(data) ? data : []);
        this.allCases = items.filter((c: KycCaseData) => this.reviewStatuses.includes(c.workflowStatusId));
        this.computeStatusCounts();
        this.applyFilter();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  computeStatusCounts() {
    const map: { [k: number]: { label: string; color: string } } = {
      100: { label: 'Pending', color: '#94a3b8' },
      200: { label: 'Under Review', color: '#3b82f6' },
      300: { label: 'Compliant', color: '#10b981' },
      400: { label: 'Non-Compliant (EDD)', color: '#f59e0b' }
    };
    this.statusCounts = Object.entries(map).map(([key, val]) => ({
      ...val,
      count: this.allCases.filter(c => c.workflowStatusId === +key).length
    }));
  }

  applyFilter() {
    if (this.statusFilter === 'all') {
      this.filteredCases = [...this.allCases];
    } else {
      this.filteredCases = this.allCases.filter(c => c.workflowStatusId === +this.statusFilter);
    }
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.trim().split(/\s+/).map(p => p.charAt(0).toUpperCase()).slice(0, 2).join('');
  }
}
