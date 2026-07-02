import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { DecimalPipe } from '@angular/common';

import { KycService } from '../../../../services/kyc.service';
import { KycTier } from '../../../../models/kyc.model';

@Component({
  standalone: false,
  selector: 'mifosx-view-tier',
  templateUrl: './view-tier.component.html',
  styles: [`
    .tier-detail-card {
      border-radius: 4px;
      margin-bottom: 24px;
    }

    .tier-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0 20px;
    }

    .tier-header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .tier-icon-wrap {
      width: 48px; height: 48px; border-radius: 50%;
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container); font-size: 20px;
      display: flex; align-items: center; justify-content: center;
    }

    .tier-name {
      margin: 0 0 4px;
      font-size: 20px;
      font-weight: 500;
    }

    .tier-code {
      font-size: 12px;
      opacity: 0.7;
      font-family: monospace;
    }

    .tier-header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .tier-level-badge {
      background: var(--mat-sys-surface-variant);
      color: var(--mat-sys-on-surface-variant);
      padding: 6px 14px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .tier-status-badge {
      padding: 6px 14px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;

      &.active { background: #d1fae5; color: #065f46; }
      &.inactive { background: #fee2e2; color: #991b1b; }
    }

    .edit-btn {
      font-weight: 500;
    }

    .tier-details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin: 24px 0;
    }

    .detail-card {
      background: var(--mat-sys-surface);
      border-radius: 4px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      border: 1px solid var(--mat-sys-outline-variant);
    }

    .detail-icon {
      width: 40px; height: 40px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
      background: var(--mat-sys-surface-variant); color: var(--mat-sys-on-surface-variant);
    }

    .detail-info { display: flex; flex-direction: column; }
    .detail-label { font-size: 11px; opacity: 0.7; font-weight: 500; text-transform: uppercase; }
    .detail-value { font-size: 16px; font-weight: 500; margin-top: 2px; }

    .tier-requirements {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .req-section {
      h3 {
        margin: 0 0 12px;
        font-size: 15px;
        font-weight: 500;
      }
    }

    .text-primary { color: var(--mat-sys-primary); }
    .m-r-5 { margin-right: 5px; }
    .text-muted { opacity: 0.7; font-size: 14px; }

    .req-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .req-chip {
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;

      &.doc-chip, &.field-chip {
        background: var(--mat-sys-surface-variant);
        color: var(--mat-sys-on-surface-variant);
        border: 1px solid var(--mat-sys-outline-variant);
      }
    }

    .mandatory-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #f44336;
      margin-left: 2px;
    }
  `]
  })
export class ViewTierComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private kycService = inject(KycService);

  tier: KycTier;
  isLoading = true;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.kycService.getTier(id).subscribe({
          next: (data) => {
            this.tier = data;
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Error fetching tier', err);
            this.isLoading = false;
          }
        });
      }
    });
  }
}
