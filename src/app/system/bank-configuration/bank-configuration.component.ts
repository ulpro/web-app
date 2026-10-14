import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BankConfiguration, BankConfigurationService } from './bank-configuration.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardHeader, MatCardTitle, MatCardSubtitle } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { SystemService } from 'app/system/system.service';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'mifosx-bank-configuration',
  templateUrl: './bank-configuration.component.html',
  styleUrls: ['./bank-configuration.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    MatDivider,
    FaIconComponent,
    FormsModule
  ]
})
export class BankConfigurationComponent implements OnInit {
  configForm: FormGroup;
  logoPreview: string | null = null;
  offices: any[] = [];
  selectedOfficeId: number = 1; // Default fallback

  constructor(
    private fb: FormBuilder,
    private bankConfigService: BankConfigurationService,
    private snackBar: MatSnackBar,
    private systemService: SystemService,
    private authService: AuthenticationService
  ) {
    this.configForm = this.fb.group({
      bankName: ['', Validators.required],
      slogan: [''],
      primaryColor: ['#1074b9', Validators.required],
      bp: [''],
      phone: [''],
      rc: [''],
      email: [''],
      paperSize: ['A4']
    });
  }

  ngOnInit(): void {
    // Get the logged in user's office to set as default
    const credentials = this.authService.getCredentials();
    if (credentials && credentials.officeId) {
      this.selectedOfficeId = credentials.officeId;
    }

    // Fetch offices for the dropdown
    this.systemService.getOffices().subscribe((offices: any[]) => {
      this.offices = offices;
    });

    this.loadConfigForSelectedOffice();
  }

  onOfficeChange(): void {
    this.loadConfigForSelectedOffice();
  }

  private loadConfigForSelectedOffice(): void {
    this.bankConfigService.getConfigForOffice(this.selectedOfficeId).subscribe(config => {
      this.configForm.patchValue({
        bankName: config.bankName,
        slogan: config.slogan,
        primaryColor: config.primaryColor,
        bp: config.bp,
        phone: config.phone,
        rc: config.rc,
        email: config.email,
        paperSize: config.paperSize || 'A4'
      });
      this.logoPreview = config.logoBase64;
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Basic validation
      if (!file.type.match('image.*')) {
        this.snackBar.open('Veuillez sélectionner une image valide', 'Fermer', { duration: 3000 });
        return;
      }
      if (file.size > 2 * 1024 * 1024) { // 2MB max
        this.snackBar.open("L'image est trop volumineuse (max 2MB)", 'Fermer', { duration: 3000 });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.logoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeLogo(): void {
    this.logoPreview = null;
  }

  saveConfiguration(): void {
    if (this.configForm.valid) {
      const config: BankConfiguration = {
        ...this.configForm.value,
        logoBase64: this.logoPreview
      };
      this.bankConfigService.updateConfiguration(config, this.selectedOfficeId).subscribe({
        next: () => {
          this.snackBar.open('Configuration sauvegardée avec succès', 'Fermer', { duration: 3000 });
        },
        error: () => {
          this.snackBar.open('Erreur lors de la sauvegarde', 'Fermer', { duration: 3000 });
        }
      });
    }
  }
}
