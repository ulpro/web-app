import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { DatePipe, CommonModule } from '@angular/common';

import { KycService } from '../../services/kyc.service';
import { KycDocument } from '../../models/kyc.model';
import { ProcessKycDocumentDialogComponent } from './process-kyc-document-dialog/process-kyc-document-dialog.component';

@Component({
  standalone: false,
  selector: 'mifosx-kyc-approval-queue',
  templateUrl: './approval-queue.component.html',
    providers: [DatePipe]
})
export class ApprovalQueueComponent implements OnInit {
  private kycService = inject(KycService);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = ['clientId', 'documentTypeName', 'documentNumber', 'issueDate', 'verificationStatus', 'actions'];
  dataSource = new MatTableDataSource<KycDocument>([]);

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  ngOnInit() {
    this.loadPendingDocuments();
  }

  loadPendingDocuments() {
    this.kycService.getAllDocuments().subscribe({
      next: (data: KycDocument[]) => {
        // Filtre côté client sur verificationStatus 100 = PENDING
        const pending = data.filter((d: KycDocument) => !d.verificationStatus || d.verificationStatus === 100);
        this.dataSource = new MatTableDataSource(pending);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error: (err: any) => {
        console.error('Error fetching pending KYC documents', err);
      }
    });
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  processDocument(document: KycDocument) {
    const dialogRef = this.dialog.open(ProcessKycDocumentDialogComponent, {
      width: '600px',
      panelClass: 'kyc-dialog',
      data: { document }
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        // Refresh queue after processing
        this.loadPendingDocuments();
      }
    });
  }
}
