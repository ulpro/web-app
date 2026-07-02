/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// -----------------------------------------------------------------------
// POST /kyc/document-types
// Champs attendus par KycDocumentTypeValidator.validateForCreate :
//   code* (String, max 50) | name* (String, max 100) | description (String, max 500) | active (Boolean)
// -----------------------------------------------------------------------
export interface KycDocumentType {
  id?: number;
  code: string;       // Obligatoire (unique en BDD)
  name: string;       // Obligatoire
  description?: string;
  active?: boolean;
}

// -----------------------------------------------------------------------
// POST /kyc/tiers
// Champs attendus par KycTierValidator.validateForCreate :
//   code* (String, max 50) | name* (String, max 100) | description (String, max 500)
//   level* (Integer > 0) | maxBalance (BigDecimal) | maxTransactionAmount (BigDecimal)
//   active (Boolean) | documentRequirements [{documentTypeId*, mandatory}]
// PUT /kyc/tiers/{id}
//   Mêmes champs sauf code (non modifiable)
// -----------------------------------------------------------------------
export interface KycDocumentRequirement {
  documentTypeId: number;   // Obligatoire : ID du KycDocumentType
  mandatory?: boolean;      // Optionnel, défaut=true
}

export interface KycTier {
  id?: number;
  code?: string;          // Obligatoire à la création
  name: string;           // Obligatoire
  description?: string;
  level: number;          // Obligatoire (Integer > 0)
  validityDays?: number;  // Nombre de jours de validité
  maxBalance?: number;    // BigDecimal optionnel
  maxTransactionAmount?: number; // BigDecimal optionnel
  active?: boolean;
  documentRequirements?: KycDocumentRequirement[];
  locale?: string;        // Requis par Fineract pour parser les entiers et BigDecimal
  dateFormat?: string;
  requiredFields?: string[]; // Ajout pour le payload backend (Fineract attend un tableau de string)
}

export const AVAILABLE_KYC_FIELDS = [
  {
    group: 'Personal Information',
    fields: [
      { id: 'firstname', label: 'First Name' },
      { id: 'middlename', label: 'Middle Name' },
      { id: 'lastname', label: 'Last Name' },
      { id: 'fullname', label: 'Full Name' },
      { id: 'display_name', label: 'Display Name' },
      { id: 'date_of_birth', label: 'Date of Birth' },
      { id: 'gender_cv_id', label: 'Gender' },
      { id: 'mobile_no', label: 'Mobile Phone Number' },
      { id: 'email_address', label: 'Email Address' }
    ]
  }
];

// Réponse enrichie du GET /kyc/tiers/{id} (lecture)
export interface KycTierData extends KycTier {
  documentRequirementsData?: {
    documentTypeId: number;
    documentTypeName: string;
    mandatory: boolean;
  }[];
}

// -----------------------------------------------------------------------
// POST /clients/{clientId}/kyc/documents
// Champs attendus par KycDocumentValidator.validateForCreate :
//   documentTypeId* (Long > 0) | documentNumber (String, max 100)
//   issueDate (LocalDate) | expiryDate (LocalDate)
//   fileLocation (String, max 500) | verificationStatus (Integer 100-500)
//   remarks (String, max 1000)
//   locale* (pour parser les dates) | dateFormat* (pour parser les dates)
// -----------------------------------------------------------------------
export interface KycDocumentCreateRequest {
  documentTypeId: number;     // Obligatoire
  documentNumber?: string;
  issueDate?: string;         // Format : yyyy-MM-dd (selon dateFormat)
  expiryDate?: string;
  fileLocation?: string;
  verificationStatus?: number; // 100=PENDING, 200=UNDER_REVIEW, 300=VERIFIED, 400=REJECTED, 500=EXPIRED
  remarks?: string;
  locale?: string;            // ex: 'en'
  dateFormat?: string;        // ex: 'yyyy-MM-dd'
}

// Réponse du GET /clients/{clientId}/kyc/documents
export interface KycDocument {
  id?: number;
  clientId?: number;
  documentTypeId?: number;
  documentTypeName?: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  fileLocation?: string;
  verificationStatus?: number;
  verificationStatusName?: string; // ex: 'PENDING', 'VERIFIED'...
  remarks?: string;
}

// -----------------------------------------------------------------------
// Statuts de document (correspondance avec KycDocumentStatus.java)
// -----------------------------------------------------------------------
export const KycDocumentStatusMap: { [value: number]: string } = {
  100: 'PENDING',
  200: 'UNDER_REVIEW',
  300: 'VERIFIED',
  400: 'REJECTED',
  500: 'EXPIRED'
};

// -----------------------------------------------------------------------
// POST /kyc/documents/{documentId}
// Le backend attend un body vide — l'action est dans le verbe (queryParam ou path)
// Les méthodes disponibles selon KycDocumentWritePlatformServiceImpl :
//   submit(), approve(), reject()
// -----------------------------------------------------------------------
export type KycDocumentActionType = 'submit' | 'approve' | 'reject';

export * from './kyc-cases.model';
