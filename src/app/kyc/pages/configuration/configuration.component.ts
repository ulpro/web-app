import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  standalone: false,
  selector: 'mifosx-kyc-configuration',
    template: `
    <div class="m-t-20">
      <div style="background: #fff; border-bottom: 1px solid var(--mat-sys-outline-variant); margin-bottom: 24px; padding: 0 24px;">
        <nav mat-tab-nav-bar [tabPanel]="configTabPanel" style="border-bottom: none;">
          <a mat-tab-link routerLink="./document-types" routerLinkActive #rla1="routerLinkActive" [active]="rla1.isActive">
            <mat-icon style="margin-right: 8px;">folder</mat-icon> Document Types
          </a>
          <a mat-tab-link routerLink="./tiers" routerLinkActive #rla2="routerLinkActive" [active]="rla2.isActive">
            <mat-icon style="margin-right: 8px;">military_tech</mat-icon> Tiers
          </a>
        </nav>
      </div>
      <mat-tab-nav-panel #configTabPanel>
        <router-outlet></router-outlet>
      </mat-tab-nav-panel>
    </div>
  `
})
export class KycConfigurationComponent {}
