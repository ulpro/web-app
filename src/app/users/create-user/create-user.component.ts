/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, OnInit, TemplateRef, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import {
  UntypedFormGroup,
  UntypedFormBuilder,
  UntypedFormControl,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, catchError } from 'rxjs/operators';

/** Custom Services */
import { UsersService } from '../users.service';
import { ClientsService } from 'app/clients/clients.service';
import { PopoverService } from '../../configuration-wizard/popover/popover.service';

/** Custom Dialog Component */
import { PasswordsUtility } from 'app/core/utils/passwords-utility';
import { confirmPasswordValidator } from 'app/login/reset-password/confirm-password.validator';
import { ConfigurationWizardService } from 'app/configuration-wizard/configuration-wizard.service';
import { ContinueSetupDialogComponent } from 'app/configuration-wizard/continue-setup-dialog/continue-setup-dialog.component';
import { MatCheckbox } from '@angular/material/checkbox';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/**
 * Create user component.
 */
@Component({
  selector: 'mifosx-create-user',
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCheckbox,
    MatAutocomplete,
    MatAutocompleteTrigger
  ]
})
export class CreateUserComponent implements OnInit, AfterViewInit {
  private formBuilder = inject(UntypedFormBuilder);
  private usersService = inject(UsersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private popoverService = inject(PopoverService);
  private configurationWizardService = inject(ConfigurationWizardService);
  private dialog = inject(MatDialog);
  private passwordsUtility = inject(PasswordsUtility);

  /** User form. */
  userForm: UntypedFormGroup;
  /** Offices data. */
  officesData: any;
  /** Roles data. */
  rolesData: any;
  /** Staff data. */
  staffData: any;

  /** Self Service Client AutoComplete fields */
  clientSearchControl = new UntypedFormControl('');
  filteredClients: any[] = [];
  isSearchingClients = false;
  selectedClientId: number | null = null;
  private clientsService = inject(ClientsService);

  /* Reference of create user form */
  @ViewChild('userFormRef') userFormRef: ElementRef<any>;
  /* Template for popover on create user form */
  @ViewChild('templateUserFormRef') templateUserFormRef: TemplateRef<any>;

  /**
   * Retrieves the offices and roles data from `resolve`.
   * @param {FormBuilder} formBuilder Form Builder.
   * @param {UsersService} UsersService Users Service.
   * @param {ActivatedRoute} route Activated Route.
   * @param {Router} router Router for navigation.
   * @param {ConfigurationWizardService} configurationWizardService ConfigurationWizard Service.
   * @param {PopoverService} popoverService PopoverService.
   */
  constructor() {
    this.route.data.subscribe((data: { usersTemplate: any }) => {
      this.officesData = data.usersTemplate.allowedOffices;
      this.rolesData = data.usersTemplate.availableRoles;
    });
  }

  /**
   * Creates the user form, sets the staff data and conditional controls of the user form.
   */
  ngOnInit() {
    this.createUserForm();
    this.setStaffData();
    this.setConditionalControls();
    this.setupClientAutocomplete();
  }

  /**
   * Creates the user form.
   */
  createUserForm() {
    this.userForm = this.formBuilder.group(
      {
        username: [
          '',
          Validators.required
        ],
        email: [
          '',
          [
            Validators.required,
            Validators.email
          ]
        ],
        firstname: [
          '',
          [
            Validators.required,
            Validators.pattern('(^[A-z]).*')
          ]
        ],
        lastname: [
          '',
          [
            Validators.required,
            Validators.pattern('(^[A-z]).*')
          ]
        ],
        sendPasswordToEmail: [true],
        passwordNeverExpires: [false],
        officeId: [
          '',
          Validators.required
        ],
        staffId: [''],
        roles: [
          '',
          Validators.required
        ],
        isSelfServiceUser: [false]
      },
      { validator: confirmPasswordValidator }
    );
  }

  /**
   * Sets the staff data each time the user selects a new office
   */
  setStaffData() {
    this.userForm.get('officeId').valueChanges.subscribe((officeId: string) => {
      this.staffData = [];
      this.usersService.getStaff(officeId).subscribe((staff: any) => {
        this.staffData = staff;
      });
    });
  }

  /**
   * Sets the conditional controls of the user form
   */
  setConditionalControls() {
    this.userForm.get('sendPasswordToEmail').valueChanges.subscribe((sendPasswordToEmail: boolean) => {
      if (sendPasswordToEmail) {
        this.userForm.removeControl('password');
        this.userForm.removeControl('repeatPassword');
        this.userForm.get('email').setValidators([
          Validators.required,
          Validators.email
        ]);
      } else {
        this.userForm.addControl('password', new UntypedFormControl('', this.passwordsUtility.getPasswordValidators()));
        this.userForm.addControl(
          'repeatPassword',
          new UntypedFormControl('', [
            Validators.required,
            this.passwordsUtility.confirmPassword('password')
          ])
        );
        this.userForm.get('email').setValidators([Validators.email]);
      }
      this.userForm.get('email').updateValueAndValidity();
    });

    this.userForm.get('isSelfServiceUser').valueChanges.subscribe((isSelfService: boolean) => {
      const rolesControl = this.userForm.get('roles');
      if (isSelfService) {
        rolesControl.clearValidators();
      } else {
        rolesControl.setValidators([Validators.required]);
      }
      rolesControl.updateValueAndValidity();
    });
  }

  /**
   * Submits the user form and creates user,
   * if successful redirects to view created user.
   */
  submit() {
    const user = this.userForm.value;
    if (this.userForm.value.staffId == null || this.userForm.value.staffId === '') {
      delete user.staffId;
    }

    if (user.isSelfServiceUser) {
      const payload: any = {
        username: user.username,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        officeId: user.officeId,
        sendPasswordToEmail: user.sendPasswordToEmail,
        passwordNeverExpires: user.passwordNeverExpires,
        clientId: this.selectedClientId
      };
      if (user.staffId) {
        payload.staffId = user.staffId;
      }
      if (!user.sendPasswordToEmail) {
        payload.password = user.password;
      }

      this.clientsService.createSelfServiceUser(payload).subscribe(() => {
        this.router.navigate(['/clients', this.selectedClientId]);
      });
    } else {
      delete user.isSelfServiceUser;
      this.usersService.createUser(user).subscribe((response: any) => {
        if (this.configurationWizardService.showUsersForm) {
          this.configurationWizardService.showUsersForm = false;
          this.openDialog();
        } else {
          this.router.navigate(
            [
              '../',
              response.resourceId
            ],
            { relativeTo: this.route }
          );
        }
      });
    }
  }

  /**
   * Popover function
   * @param template TemplateRef<any>.
   * @param target HTMLElement | ElementRef<any>.
   * @param position String.
   * @param backdrop Boolean.
   */
  showPopover(
    template: TemplateRef<any>,
    target: HTMLElement | ElementRef<any>,
    position: string,
    backdrop: boolean
  ): void {
    setTimeout(() => this.popoverService.open(template, target, position, backdrop, {}), 200);
  }

  /**
   * To show popover.
   */
  ngAfterViewInit() {
    if (this.configurationWizardService.showUsersForm) {
      setTimeout(() => {
        this.showPopover(this.templateUserFormRef, this.userFormRef.nativeElement, 'top', true);
      });
    }
  }

  /**
   * Next Step (Maker Checker Tasks System Page) Configuration Wizard.
   */
  nextStep() {
    this.configurationWizardService.showUsersForm = false;
    this.configurationWizardService.showMakerCheckerTable = true;
    this.router.navigate(['/system']);
  }

  /**
   * Previous Step (Users page) Configuration Wizard.
   */
  previousStep() {
    this.configurationWizardService.showUsersForm = false;
    this.configurationWizardService.showUsersList = true;
    this.router.navigate(['/appusers']);
  }

  setupClientAutocomplete() {
    this.clientSearchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      tap(() => {
        this.isSearchingClients = true;
        this.filteredClients = [];
      }),
      switchMap((term: any) => {
        const officeId = this.userForm.get('officeId')?.value;
        if (typeof term === 'string' && term.trim().length >= 2 && officeId) {
          return this.clientsService.getFilteredClients('displayName', 'ASC', false, term, officeId).pipe(
            catchError(() => of({ pageItems: [] }))
          );
        } else {
          return of({ pageItems: [] });
        }
      })
    ).subscribe({
      next: (data: any) => {
        this.filteredClients = data.pageItems || [];
        this.isSearchingClients = false;
      },
      error: () => {
        this.isSearchingClients = false;
      }
    });
  }

  displayClientFn(client: any): string {
    return client ? `${client.displayName} (${client.accountNo})` : '';
  }

  onClientSelected(event: any) {
    const client = event.option.value;
    this.selectedClientId = client ? client.id : null;
  }

  /**
   * Opens dialog if the user wants to create more users.
   */
  openDialog() {
    const continueSetupDialogRef = this.dialog.open(ContinueSetupDialogComponent, {
      data: {
        stepName: 'user'
      }
    });
    continueSetupDialogRef.afterClosed().subscribe((response: { step: number }) => {
      if (response.step === 1) {
        this.configurationWizardService.showUsersForm = false;
        this.router.navigate(['../'], { relativeTo: this.route });
      } else if (response.step === 2) {
        this.configurationWizardService.showUsersForm = true;
        this.router.routeReuseStrategy.shouldReuseRoute = () => false;
        this.router.onSameUrlNavigation = 'reload';
        this.router.navigate(['/organization/users/create']);
      } else if (response.step === 3) {
        this.configurationWizardService.showUsersForm = false;
        this.configurationWizardService.showMakerCheckerTable = true;
        this.router.navigate(['/system']);
      }
    });
  }
}
