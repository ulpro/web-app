import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';

import { KycService } from '../../services/kyc.service';
import { KycTier } from '../../models/kyc.model';

@Component({
  standalone: false,
  selector: 'mifosx-kyc-tiers',
  templateUrl: './tiers.component.html',
  styleUrls: ['./tiers.component.scss']
})
export class TiersComponent implements OnInit {
  private kycService = inject(KycService);

  displayedColumns: string[] = ['name', 'maxBalance', 'maxTransactionAmount', 'active'];
  dataSource = new MatTableDataSource<KycTier>([]);

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  ngOnInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.loadTiers();
  }

  loadTiers() {
    this.kycService.getTiers().subscribe({
      next: (data: any) => {
        const items = data?.pageItems ? data.pageItems : data;
        this.dataSource.data = items || [];
      },
      error: (err) => {
        console.error('Error fetching tiers', err);
      }
    });
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}
