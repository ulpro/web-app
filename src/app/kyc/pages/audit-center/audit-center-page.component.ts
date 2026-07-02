import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { KycService } from '../../services/kyc.service';
import { KycCaseData, KycCaseHistoryData } from '../../models/kyc.model';

@Component({
  standalone: false,
  selector: 'mifosx-audit-center-page',
  template: `
    <div class="audit-page">

      <div class="page-header">
        <div>
          <h2 class="page-title">Audit Center</h2>
          <p class="page-subtitle">Complete history of finalized KYC cases</p>
        </div>
        <div class="header-actions">
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Filter</mat-label>
            <mat-select [(value)]="statusFilter" (selectionChange)="applyFilter()">
              <mat-option value="all">All Finalized</mat-option>
              <mat-option value="600">Approved</mat-option>
              <mat-option value="700">Rejected</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <!-- Summary -->
      <div class="summary-bar" *ngIf="allCases.length > 0">
        <div class="summary-chip approved-chip">
          <span class="sc-dot"></span> {{ approvedCount }} Approved
        </div>
        <div class="summary-chip rejected-chip">
          <span class="sc-dot"></span> {{ rejectedCount }} Rejected
        </div>
      </div>

      <!-- Cases -->
      <div class="audit-list" *ngIf="filteredCases.length > 0">
        <div class="audit-card" *ngFor="let c of filteredCases">
          <div class="ac-header">
            <div class="ac-left">
              <span class="ac-avatar" [ngClass]="c.workflowStatusId === 600 ? 'av-approved' : 'av-rejected'">
                {{ c.workflowStatusId === 600 ? '&#x2705;' : '&#x274C;' }}
              </span>
              <div>
                <span class="ac-name">{{ c.clientName }}</span>
                <span class="ac-meta">Case #{{ c.id }} &middot; Tier: {{ c.tier?.name || 'None' }} &middot; Agent: {{ c.assignedAgentName || 'N/A' }}</span>
              </div>
            </div>
            <div class="ac-right">
              <span class="final-badge" [ngClass]="c.workflowStatusId === 600 ? 'fb-approved' : 'fb-rejected'">
                {{ c.workflowStatusValue }}
              </span>
              <span class="ac-date">{{ c.lastModifiedDate | date:'medium' }}</span>
            </div>
          </div>

          <!-- Expandable Timeline -->
          <div class="ac-expand" *ngIf="c._expanded">
            <div class="timeline" *ngIf="c._history?.length > 0">
              <div class="tl-item" *ngFor="let h of c._history; let last = last">
                <div class="tl-dot" [class.tl-last]="last"></div>
                <div class="tl-content">
                  <span class="tl-action">{{ h.fromStatusValue || 'Start' }} &#x2192; {{ h.toStatusValue }}</span>
                  <span class="tl-meta">{{ h.actorUsername || 'System' }} &middot; {{ h.createdDate | date:'medium' }}</span>
                  <span class="tl-comment" *ngIf="h.comments">{{ h.comments }}</span>
                </div>
              </div>
            </div>
            <p class="tl-empty" *ngIf="!c._history || c._history.length === 0">No history available.</p>
          </div>

          <button class="expand-btn" (click)="toggleExpand(c)">
            {{ c._expanded ? 'Hide Timeline &#x25B2;' : 'Show Timeline &#x25BC;' }}
          </button>
        </div>
      </div>

      <div class="empty-state" *ngIf="filteredCases.length === 0 && !loading">
        <span class="empty-icon">&#x1F4DC;</span>
        <p>No finalized cases found.</p>
      </div>

    </div>
  `,
  styles: [`
    .audit-page { padding: 0; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;
    }
    .page-title { font-size: 24px; font-weight: 700; color: #1a1a2e; margin: 0; }
    .page-subtitle { color: #6b7280; font-size: 14px; margin: 4px 0 0; }
    .header-actions { display: flex; align-items: center; gap: 12px; }
    .filter-field { width: 180px; }
    ::ng-deep .filter-field .mat-mdc-form-field-subscript-wrapper { display: none; }

    .summary-bar { display: flex; gap: 12px; margin-bottom: 20px; }
    .summary-chip {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 18px; border-radius: 20px; font-size: 13px; font-weight: 600;
    }
    .approved-chip { background: #d1fae5; color: #059669; }
    .rejected-chip { background: #fee2e2; color: #dc2626; }
    .sc-dot { width: 8px; height: 8px; border-radius: 50%; }
    .approved-chip .sc-dot { background: #10b981; }
    .rejected-chip .sc-dot { background: #ef4444; }

    .audit-list { display: flex; flex-direction: column; gap: 12px; }
    .audit-card {
      background: #fff; border-radius: 14px; padding: 20px 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06); border: 1px solid #f3f4f6;
      transition: box-shadow .2s;
    }
    .audit-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }

    .ac-header { display: flex; justify-content: space-between; align-items: center; }
    .ac-left { display: flex; align-items: center; gap: 14px; }
    .ac-avatar {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; font-size: 18px;
    }
    .av-approved { background: #d1fae5; }
    .av-rejected { background: #fee2e2; }
    .ac-name { font-size: 15px; font-weight: 600; color: #1a1a2e; display: block; }
    .ac-meta { font-size: 12px; color: #9ca3af; }
    .ac-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .final-badge {
      padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: .3px;
    }
    .fb-approved { background: #d1fae5; color: #059669; }
    .fb-rejected { background: #fee2e2; color: #dc2626; }
    .ac-date { font-size: 12px; color: #9ca3af; }

    /* Timeline */
    .ac-expand { padding: 16px 0 8px 20px; }
    .timeline { position: relative; padding-left: 20px; }
    .tl-item {
      display: flex; gap: 14px; padding-bottom: 16px; position: relative;
    }
    .tl-item:last-child { padding-bottom: 0; }
    .tl-dot {
      width: 10px; height: 10px; border-radius: 50%; background: #6366f1;
      position: absolute; left: -25px; top: 4px;
      box-shadow: 0 0 0 3px #eef2ff;
    }
    .tl-dot.tl-last { background: #10b981; box-shadow: 0 0 0 3px #ecfdf5; }
    .tl-item:not(:last-child)::before {
      content: ''; position: absolute; left: -21px; top: 14px;
      width: 2px; height: calc(100% - 6px); background: #e5e7eb;
    }
    .tl-content { display: flex; flex-direction: column; gap: 2px; }
    .tl-action { font-size: 13px; font-weight: 500; color: #374151; }
    .tl-meta { font-size: 11px; color: #9ca3af; }
    .tl-comment {
      font-size: 12px; color: #6b7280; font-style: italic;
      background: #f9fafb; padding: 4px 8px; border-radius: 6px; margin-top: 4px;
    }
    .tl-empty { font-size: 13px; color: #9ca3af; }

    .expand-btn {
      display: block; width: 100%; margin-top: 12px;
      padding: 8px; border: none; background: #f9fafb;
      border-radius: 8px; cursor: pointer; font-size: 12px;
      color: #6366f1; font-weight: 500; transition: background .15s;
    }
    .expand-btn:hover { background: #eef2ff; }

    .empty-state { text-align: center; padding: 60px 20px; color: #9ca3af; }
    .empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }
  `]
})
export class AuditCenterPageComponent implements OnInit {
  private kycService = inject(KycService);
  allCases: any[] = [];
  filteredCases: any[] = [];
  statusFilter = 'all';
  loading = false;
  approvedCount = 0;
  rejectedCount = 0;

  ngOnInit() { this.loadCases(); }

  loadCases() {
    this.loading = true;
    this.kycService.getCases().subscribe({
      next: (data: any) => {
        const items = data?.pageItems ? data.pageItems : (Array.isArray(data) ? data : []);
        this.allCases = items
          .filter((c: KycCaseData) => c.workflowStatusId === 600 || c.workflowStatusId === 700)
          .map((c: any) => ({ ...c, _expanded: false, _history: null }));
        this.approvedCount = this.allCases.filter(c => c.workflowStatusId === 600).length;
        this.rejectedCount = this.allCases.filter(c => c.workflowStatusId === 700).length;
        this.applyFilter();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  applyFilter() {
    if (this.statusFilter === 'all') {
      this.filteredCases = [...this.allCases];
    } else {
      this.filteredCases = this.allCases.filter(c => c.workflowStatusId === +this.statusFilter);
    }
  }

  toggleExpand(c: any) {
    c._expanded = !c._expanded;
    if (c._expanded && c._history === null) {
      this.kycService.getCaseHistory(c.id).subscribe({
        next: (history: any[]) => c._history = history || [],
        error: () => c._history = []
      });
    }
  }
}
