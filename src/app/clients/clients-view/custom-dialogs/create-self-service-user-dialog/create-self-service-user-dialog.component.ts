/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose
} from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { MatIconButton } from '@angular/material/button';

@Component({
  selector: 'mifosx-create-self-service-user-dialog',
  templateUrl: './create-self-service-user-dialog.component.html',
  styleUrls: ['./create-self-service-user-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    CdkScrollable,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatIconButton
  ]
})
export class CreateSelfServiceUserDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  dialogRef = inject<MatDialogRef<CreateSelfServiceUserDialogComponent>>(MatDialogRef);
  data = inject(MAT_DIALOG_DATA);

  selfServiceUserForm: FormGroup;
  hidePassword = true;
  hideRepeatPassword = true;

  ngOnInit() {
    this.createForm();
  }

  createForm() {
    let defaultUsername = '';
    if (this.data.firstname && this.data.lastname) {
      defaultUsername = `${this.data.firstname.trim()}.${this.data.lastname.trim()}`.toLowerCase().replace(/\s+/g, '');
    } else if (this.data.displayName) {
      defaultUsername = this.data.displayName.trim().toLowerCase().replace(/\s+/g, '.');
    }

    this.selfServiceUserForm = this.fb.group({
      username: [defaultUsername, [Validators.required, Validators.maxLength(100)]],
      email: [this.data.emailAddress || '', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]],
      repeatPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const repeatPassword = form.get('repeatPassword')?.value;
    return password === repeatPassword ? null : { passwordMismatch: true };
  }

  submit() {
    if (this.selfServiceUserForm.valid) {
      const formValue = this.selfServiceUserForm.value;
      const payload = {
        username: formValue.username,
        email: formValue.email,
        firstname: this.data.firstname || this.data.displayName || 'SelfService',
        lastname: this.data.lastname || 'User',
        password: formValue.password,
        officeId: this.data.officeId,
        clientId: this.data.id,
        sendPasswordToEmail: true
      };
      this.dialogRef.close({ confirm: true, payload });
    }
  }
}
