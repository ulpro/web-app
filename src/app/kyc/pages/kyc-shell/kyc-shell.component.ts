import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

@Component({
  standalone: false,
  selector: 'mifosx-kyc-shell',
  template: `
    <div class="m-t-10 m-b-10 m-l-10 m-r-10">
      <!-- Navigation -->
      <nav mat-tab-nav-bar class="navigation-tabs" [tabPanel]="tabPanel">
        <a mat-tab-link routerLink="./dashboard" routerLinkActive #rla1="routerLinkActive" [active]="rla1.isActive">
          <fa-icon icon="tachometer-alt" class="m-r-10"></fa-icon> Dashboard
        </a>
        <a mat-tab-link routerLink="./cases" routerLinkActive #rla2="routerLinkActive" [active]="rla2.isActive">
          <fa-icon icon="folder-open" class="m-r-10"></fa-icon> KYC Cases
        </a>

        <a mat-tab-link routerLink="./configuration" routerLinkActive #rla6="routerLinkActive" [active]="rla6.isActive">
          <fa-icon icon="cog" class="m-r-10"></fa-icon> Configuration
        </a>
      </nav>
      <mat-tab-nav-panel #tabPanel>
        <router-outlet></router-outlet>
      </mat-tab-nav-panel>
    </div>
  `,
  styles: [`
    .navigation-tabs {
      margin-bottom: 24px;
    }
  `]
})
export class KycShellComponent {}
