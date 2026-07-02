import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';

import { KycService } from '../../services/kyc.service';
import { KycDocumentType } from '../../models/kyc.model';
import { CreateDocumentTypeDialogComponent } from './create-document-type-dialog/create-document-type-dialog.component';

@Component({
  standalone: false,
  selector: 'mifosx-kyc-document-types',
  templateUrl: './document-types.component.html',
  styleUrls: ['./document-types.component.scss']
})
export class DocumentTypesComponent implements OnInit {
  private kycService = inject(KycService);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = ['name', 'description', 'active'];
  dataSource = new MatTableDataSource<KycDocumentType>([]);

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  ngOnInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.loadDocumentTypes();
  }

  loadDocumentTypes() {
    this.kycService.getDocumentTypes().subscribe({
      next: (data: any) => {
        const items = data?.pageItems ? data.pageItems : data;
        this.dataSource.data = items || [];
      },
      error: (err) => {
        console.error('Error fetching document types', err);
      }
    });
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(CreateDocumentTypeDialogComponent, {
      width: '400px',
      panelClass: 'kyc-dialog'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // If result is true, a new document type was created
        this.loadDocumentTypes();
      }
    });
  }
}
