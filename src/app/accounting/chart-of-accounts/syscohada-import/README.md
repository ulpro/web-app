# SYSCOHADA Import Feature

## Overview

Cette fonctionnalité permet d'importer automatiquement les comptes du plan comptable SYSCOHADA (Système Comptable Harmonisé de l'OHADA) dans le formulaire de création de compte GL (General Ledger).

## Components Créés

### 1. Dialog Component: `syscohada-import.dialog.ts`

- **Location**: `src/app/accounting/chart-of-accounts/syscohada-import/`
- **Purpose**: Affiche une interface interactive en arbre du plan SYSCOHADA
- **Features**:
  - Expansion/collapse des classes SYSCOHADA
  - Sélection des comptes à importer
  - Mappage automatique du type de compte GL (ASSET, LIABILITY, EQUITY, INCOME, EXPENSE)
  - Aperçu du compte sélectionné

### 2. Template: `syscohada-import.dialog.html`

- Interface Material Dialog
- Tree structure avec expansion buttons
- Account selection avec highlighting
- Preview summary du compte sélectionné

### 3. Styles: `syscohada-import.dialog.scss`

- Grid system 8px (conformément aux standards Mifos)
- Color highlighting pour sélection
- Indentation visuelle pour hiérarchie

## Modifications au Composant Existant

### `create-gl-account.component.ts`

- Import du composant dialog
- Ajout de la méthode `importFromSYSCOHADA()`
- Ajout de la méthode `populateFormFromSYSCOHADA()`

### `create-gl-account.component.html`

- Ajout du bouton "Import SYSCOHADA" dans les actions
- Bouton placé entre "Cancel" et "Submit"

## Assets

### `plan_comptable_SYSCOHADA.json`

- **Location**: `src/assets/plan_comptable_SYSCOHADA.json`
- Contient la structure complète du plan SYSCOHADA
- Hiérarchie: Classes → Comptes → Sous-comptes → Détails
- 9 classes, 89+ comptes, 200+ sous-comptes

## Mapping SYSCOHADA vers Fineract GL Type

| Classe SYSCOHADA | Intitulé                          | Type Fineract   | Numéro |
| ---------------- | --------------------------------- | --------------- | ------ |
| 1                | Comptes de Ressources Durables    | EQUITY          | 3      |
| 2                | Comptes d'Actif Immobilisé        | ASSET           | 1      |
| 3                | Comptes de Stocks                 | ASSET           | 1      |
| 4                | Comptes de Tiers                  | ASSET/LIABILITY | 1\*    |
| 5                | Comptes de Trésorerie             | ASSET           | 1      |
| 6                | Charges des Activités Ordinaires  | EXPENSE         | 5      |
| 7                | Produits des Activités Ordinaires | INCOME          | 4      |
| 8                | Charges & Produits HAO            | EXPENSE         | 5\*    |
| 9                | Comptabilité Analytique           | EXPENSE         | 5\*    |

\*Type par défaut; peut être ajusté selon le contexte.

## Utilisation

1. Naviguer vers: `/accounting/chart-of-accounts/gl-accounts/create`
2. Cliquer sur le bouton "Import SYSCOHADA"
3. Sélectionner un compte dans la hiérarchie SYSCOHADA
4. Cliquer sur "Import"
5. Les champs du formulaire sont remplis automatiquement:
   - GL Code: numéro du compte SYSCOHADA
   - Account Name: libellé du compte SYSCOHADA
   - Account Type: type Fineract correspondant
6. Compléter les autres champs si nécessaire et soumettre

## Traductions

Les traductions utilisent les clés existantes:

- `labels.buttons.Import` - Bouton Import
- `labels.buttons.Cancel` - Bouton Cancel
- `labels.inputs.GL Code` - Étiquette GL Code
- `labels.inputs.Account Name` - Étiquette Account Name
- `labels.inputs.Account Type` - Étiquette Account Type

## Next Steps

1. Exécuter: `npm run headers:add` pour ajouter les headers Mozilla Public License
2. Exécuter: `npm run lint` pour vérifier la formatting
3. Exécuter: `npm run test` pour vérifier les tests
4. Créer une Pull Request avec la branche: `WEB-<Jira_ID>-add-syscohada-import`

## Fichiers Modifiés

- `src/app/accounting/chart-of-accounts/create-gl-account/create-gl-account.component.ts`
- `src/app/accounting/chart-of-accounts/create-gl-account/create-gl-account.component.html`

## Fichiers Créés

- `src/app/accounting/chart-of-accounts/syscohada-import/syscohada-import.dialog.ts`
- `src/app/accounting/chart-of-accounts/syscohada-import/syscohada-import.dialog.html`
- `src/app/accounting/chart-of-accounts/syscohada-import/syscohada-import.dialog.scss`
- `src/assets/plan_comptable_SYSCOHADA.json`
