/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);

  public environment = environment;
  FINERACT_PLATFORM_TENANT_IDENTIFIER = environment.fineractPlatformTenantId;

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getAccessToken();
    let headersConfig: { [key: string]: string } = {
      'Fineract-Platform-TenantId': this.FINERACT_PLATFORM_TENANT_IDENTIFIER
    };
    
    const isFormData = req.body instanceof FormData || (req.body && typeof req.body.append === 'function');
    
    // N'ajouter application/json que si ce n'est pas un FormData
    if (!isFormData) {
      headersConfig['Content-Type'] = req.headers.get('Content-Type') || 'application/json';
    } else if (req.headers.has('Content-Type')) {
      headersConfig['Content-Type'] = req.headers.get('Content-Type') as string;
    }

    const publicEndpoints = [
      '/auth/test',
      '/health'
    ];
    const isPublicEndpoint = publicEndpoints.some((url) => req.url.includes(url));

    if (token && !isPublicEndpoint) {
      headersConfig['Authorization'] = `Bearer ${token}`;
    }

    const authReq = req.clone({ setHeaders: headersConfig });

    return next.handle(authReq).pipe(
      catchError((err) => {
        if (err instanceof HttpErrorResponse && err.status === 401 && !isPublicEndpoint) {
          return from(this.handle401Error(authReq, next));
        }
        return throwError(() => err);
      })
    );
  }

  private async handle401Error(request: HttpRequest<any>, next: HttpHandler): Promise<HttpEvent<any>> {
    try {
      await this.authService.refreshToken();
      const newToken = this.authService.getAccessToken();
      if (newToken) {
        let retryHeaders: { [key: string]: string } = {
            Authorization: `Bearer ${newToken}`,
            'Fineract-Platform-TenantId': this.FINERACT_PLATFORM_TENANT_IDENTIFIER
        };
        const isRetriedFormData = request.body instanceof FormData || (request.body && typeof request.body.append === 'function');
        if (!isRetriedFormData) {
          retryHeaders['Content-Type'] = request.headers.get('Content-Type') || 'application/json';
        } else if (request.headers.has('Content-Type')) {
          retryHeaders['Content-Type'] = request.headers.get('Content-Type') as string;
        }

        const retriedReq = request.clone({
          setHeaders: retryHeaders
        });
        return next.handle(retriedReq).toPromise() as Promise<HttpEvent<any>>;
      } else {
        throw new Error('No new access token obtained after refresh');
      }
    } catch (e) {
      console.error('Error in handle401Error, forcing logout');
      throw e;
    }
  }
}
