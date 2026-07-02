import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { ClientsService } from 'app/clients/clients.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { KycService } from '../../../services/kyc.service';
import { KycCaseData } from '../../../models/kyc.model';
import { AuthenticationService } from '../../../../core/authentication/authentication.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    MatCardModule,
    FontAwesomeModule
  ],
  selector: 'mifosx-kyc-case-list',
  templateUrl: './case-list.component.html',
  styleUrls: ['./case-list.component.scss']
})
export class CaseListComponent implements OnInit {
  private kycService = inject(KycService);

  displayedColumns: string[] = ['clientInfo', 'clientType', 'tier', 'workflowStatus', 'createdDate', 'assignment', 'completion', 'actions'];
  private clientsService = inject(ClientsService);
  private authenticationService = inject(AuthenticationService);
  clientTypeMap = new Map<number, string>();
  dataSource = new MatTableDataSource<KycCaseData>([]);

  get currentAgentId(): number {
    const creds = this.authenticationService.getCredentials();
    return creds ? creds.userId : 1;
  }

  get currentAgentName(): string {
    const creds = this.authenticationService.getCredentials();
    return creds ? creds.username : 'Current User';
  }

  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort!: MatSort;

  private route = inject(ActivatedRoute);

  pageTitle = 'KYC Cases';
  pageSubtitle = "Manage and analyze your clients' compliance cases";
  
  searchFilter = '';
  tierFilter: any = '';
  statusFilter: any = '';
  tiers: any[] = [];
  
  // KPIs
  closedRejectedCases = 0;
  pendingCases = 0;
  eddCases = 0;
  compliantCases = 0;

  ngOnInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.filterPredicate = this.customFilterPredicate();
    
    this.route.data.subscribe(data => {
      if (data['statusFilter']) {
        this.statusFilter = data['statusFilter'];
      }
      if (data['title']) {
        this.pageTitle = data['title'];
        this.pageSubtitle = 'Manage cases requiring enhanced scrutiny';
      }
      this.loadData();
    });
  }

  loadData() {
    forkJoin({
      tiers: this.kycService.getTiers(),
      cases: this.kycService.getCases({ limit: 1000 }),
      clients: this.clientsService.getClients('id', 'asc', 0, 1000)
    }).subscribe({
      next: (res: any) => {
        this.tiers = res.tiers || [];

        // Build client type map
        const allClients = res.clients?.pageItems || (Array.isArray(res.clients) ? res.clients : []);
        allClients.forEach((cl: any) => {
          if (cl.id && cl.clientType?.name) {
            this.clientTypeMap.set(cl.id, cl.clientType.name);
          }
        });
        
        const items = res.cases?.pageItems ? res.cases.pageItems : res.cases;
        
        if (items && items.length > 0) {
          items.forEach((item: any) => {
            // Map tier name
            const tId = item.tier?.id || item.tierId;
            if (tId) {
              const matched = this.tiers.find(t => t.id === tId);
              if (matched) {
                item.tier = { id: matched.id, name: matched.name };
              }
            }
            if (item.assignedAgentId === this.currentAgentId && 
                (!item.assignedAgentName || item.assignedAgentName.startsWith('Agent '))) {
              item.assignedAgentName = this.currentAgentName;
            }
          });
        }
        
        this.dataSource.data = items || [];
        this.calculateKPIs();
        this.applyFilter();
      },
      error: (err: any) => console.error('Error fetching cases', err)
    });
  }

  // Backwards compatibility for the refresh button in HTML
  loadCases() {
    this.loadData();
  }

  calculateKPIs() {
    this.closedRejectedCases = this.dataSource.data.filter(c => c.workflowStatusId === 500 || c.workflowStatusId === 600).length;
    this.pendingCases = this.dataSource.data.filter(c => c.workflowStatusId === 100 || c.workflowStatusId === 300).length;
    this.eddCases = this.dataSource.data.filter(c => c.workflowStatusId === 400).length;
    this.compliantCases = this.dataSource.data.filter(c => c.workflowStatusId === 200).length;
  }

  applyFilter() {
    this.dataSource.filter = JSON.stringify({
      search: this.searchFilter.trim().toLowerCase(),
      tier: this.tierFilter,
      status: this.statusFilter
    });
  }

  customFilterPredicate() {
    return (data: KycCaseData, filter: string): boolean => {
      try {
        const searchObj = JSON.parse(filter);
        
        const matchSearch = searchObj.search ? 
          (data.clientName?.toLowerCase().includes(searchObj.search) || data.id?.toString().includes(searchObj.search) || data.clientId?.toString().includes(searchObj.search)) : true;
        
        const matchTier = searchObj.tier ? data.tier?.id === searchObj.tier : true;
        const matchStatus = searchObj.status ? data.workflowStatusId === searchObj.status : true;

        return matchSearch && matchTier && matchStatus;
      } catch (e) {
        // Fallback to simple search if not JSON
        return data.clientName?.toLowerCase().includes(filter) || data.id?.toString().includes(filter);
      }
    };
  }

  parseDate(dateVal: any): Date | null {
    if (!dateVal) return null;
    if (Array.isArray(dateVal)) {
      if (dateVal.length >= 3) {
        return new Date(dateVal[0], dateVal[1] - 1, dateVal[2], dateVal[3] || 0, dateVal[4] || 0, dateVal[5] || 0);
      }
    }
    return new Date(dateVal);
  }
}
