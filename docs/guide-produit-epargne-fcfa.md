# Guide creation produit d'epargne FCFA

## Objectif

Ce guide explique comment creer un produit d'epargne en FCFA avec une comptabilite reelle dans Mifos X, sans utiliser l'option None.

## Prerequis

- Le backend Fineract local doit etre accessible.
- Le frontend doit tourner sur http://localhost:4200.
- L'utilisateur doit etre connecte avec un profil ayant acces a l'organisation, au plan comptable et aux produits.
- La devise FCFA doit etre disponible dans l'organisation.

## 1. Verifier ou ajouter la devise FCFA

Aller dans :

- Organization
- Currency Configuration
- Manage Currencies

Verifier qu'une devise FCFA est disponible, par exemple :

- CFA Franc BEAC

Si elle n'est pas encore active, l'ajouter avant de creer le produit.

## 2. Creer les comptes comptables necessaires

Si le plan comptable ne contient pas encore les comptes de passif necessaires pour l'epargne FCFA, creer au minimum les comptes suivants dans :

- Accounting
- Chart of Accounts
- Create GL Account

### Compte 1

- Account Type : LIABILITY
- Account Usage : DETAIL
- Account Name : Epargne - Compte de controle FCFA
- GL Code : 251001
- Manual Entries Allowed : Yes

### Compte 2

- Account Type : LIABILITY
- Account Usage : DETAIL
- Account Name : Epargne - Transferts en suspense FCFA
- GL Code : 251002
- Manual Entries Allowed : Yes

## 3. Creer le produit d'epargne

Aller dans :

- Products
- Saving Products
- Create

### Etape DETAILS

Renseigner au minimum :

- Product Name : Produit FCFA Comptable
- Short Name : PFCF

### Etape CURRENCY

Renseigner :

- Currency : CFA Franc BEAC
- Decimal Places : 2

### Etape TERMS

Renseigner au minimum :

- Nominal Annual Interest : 5
- Interest Compounding Period : Daily
- Interest Posting Period : Monthly
- Interest Calculated using : Daily Balance
- Days in Year : 365 Days

### Etape SETTINGS

Laisser les valeurs par defaut si aucun besoin fonctionnel particulier.

### Etape CHARGES

Ne rien ajouter si aucun frais n'est requis.

## 4. Configurer la comptabilite du produit

Dans l'etape ACCOUNTING :

- Ne pas choisir None
- Choisir Cash

Ensuite mapper les comptes avec une logique proche du plan comptable existant.

### Mappings utilises

#### Assets

- Saving reference : (201) Frais de developpement et de prospection
- Overdraft portfolio : (201) Frais de developpement et de prospection

#### Liabilities

- Saving control : (251001) Epargne - Compte de controle FCFA
- Savings transfers in suspense : (251002) Epargne - Transferts en suspense FCFA

#### Income

- Income from fees : (701) Ventes de marchandises
- Income from penalties : (701) Ventes de marchandises
- Income from Interest / Overdraft Interest Income : (701) Ventes de marchandises

#### Expenses

- Interest on savings : (601) Achats de marchandises
- Write-off : (601) Achats de marchandises

## 5. Finaliser

Aller sur PREVIEW puis verifier :

- la devise FCFA
- le type de comptabilite Cash
- les comptes de passif 251001 et 251002

Cliquer ensuite sur Submit.

## Resultat attendu

Le produit est cree et la page de detail general du produit s'ouvre.

Exemple cree durant la session :

- Nom : Produit FCFA Comptable
- Devise : CFA Franc BEAC
- Comptabilite : Cash

## Points d'attention

- Si FCFA n'apparait pas dans la liste des devises, il faut d'abord l'ajouter dans la configuration des devises.
- Si le bouton Next ou Submit reste desactive dans ACCOUNTING, verifier que tous les comptes obligatoires sont renseignes.
- Si certains comptes de passif n'existent pas, il faut les creer dans le plan comptable avant de revenir au produit.
- Eviter l'option None si l'objectif est d'utiliser une comptabilite produit coherente avec le plan comptable installe.

## 6. Utiliser les ecritures comptables

Dans Mifos X, les ecritures comptables se gerent principalement depuis le module :

- Accounting
- Journal Entries

Les usages principaux sont :

- saisir une ecriture manuelle
- rechercher une ecriture existante
- consulter le detail d'une transaction comptable
- utiliser des saisies frequentes
- controler les ecritures avant cloture

### 6.1 Creer une ecriture comptable manuelle

Aller dans :

- Accounting
- Journal Entries
- Create

Les champs attendus sont generalement :

- Office
- Currency
- Transaction Date
- une ou plusieurs lignes au debit
- une ou plusieurs lignes au credit
- Reference Number si besoin
- Payment Type si besoin
- Comments pour documenter l'operation

### Regle fondamentale

Le total des debits doit etre egal au total des credits.

Exemple simple :

- Debit : 251001 Epargne - Compte de controle FCFA = 100000
- Credit : 701xxx Produit / frais / interets = 100000

ou inversement selon le sens economique reel de l'operation.

### Bonnes pratiques de saisie

- choisir la bonne date comptable
- ajouter une reference ou un commentaire explicite
- utiliser les bons comptes GL selon la nature de l'operation
- eviter de melanger plusieurs operations differentes dans une seule ecriture manuelle

## 6.2 Rechercher et verifier des ecritures

Aller dans :

- Accounting
- Journal Entries

L'ecran de recherche permet en pratique de filtrer par :

- Office
- GL Account
- type d'entree manuelle ou systeme
- Transaction ID
- plage de dates de transaction
- plage de dates de soumission

Cet ecran est utile pour :

- retrouver une ecriture precise
- verifier qu'un produit ou une operation a bien genere ses mouvements
- auditer les mouvements d'un compte GL donne

## 6.3 Consulter une transaction comptable

Depuis la liste des ecritures, ouvrir la transaction pour voir :

- l'identifiant de transaction
- la date de transaction
- les comptes impactes
- les montants debit et credit
- l'utilisateur createur
- la date de soumission

Utiliser cet ecran pour confirmer :

- que le bon compte a ete touche
- que le montant est correct
- que l'ecriture est equilibree

## 6.4 Corriger une erreur comptable

En pratique, il faut eviter de modifier l'historique de facon destructive.

Approche recommandee :

- identifier l'ecriture erronee
- passer une ecriture de contrepassation ou de regularisation
- saisir ensuite l'ecriture correcte

Exemple :

- si 10000 FCFA ont ete portes sur le mauvais compte de revenu
- passer une ecriture inverse pour annuler l'impact
- puis enregistrer la bonne ecriture sur le bon compte

Cette approche laisse une piste d'audit propre.

## 6.5 Utiliser les Frequent Postings

Aller dans :

- Accounting
- Journal Entries
- Frequent Postings

Cet ecran sert a accelerer les ecritures repetitives en s'appuyant sur :

- les offices
- les devises
- les types de paiement
- les associations de regles comptables

Cas utiles :

- frais recurrents
- regularisations standard
- mouvements repetitifs entre comptes connus

## 6.6 Gerer les Financial Activity Mappings

Aller dans :

- Accounting
- Financial Activity Mappings

Ces mappings servent a rattacher certaines activites financieres a des comptes GL cibles.

Ils sont utiles pour :

- standardiser le comportement comptable
- eviter des choix manuels repetes
- mieux aligner la comptabilite fonctionnelle avec le plan comptable

Si une activite revient souvent, il est preferable de la mapper proprement plutot que de corriger manuellement apres coup.

## 6.7 Gerer les Accounting Rules

Aller dans :

- Accounting
- Accounting Rules

Les regles comptables permettent de structurer comment certains flux doivent se comporter.

Elles sont utiles pour :

- normaliser la saisie
- fiabiliser les imputations
- reduire les erreurs de selection de comptes

Avant de multiplier les ecritures manuelles, verifier si une regle comptable n'est pas plus adaptee.

## 6.8 Gerer les Closing Entries

Aller dans :

- Accounting
- Closing Entries

Les clotures servent a figer un etat comptable a une date donnee.

Avant cloture :

- verifier les ecritures en attente
- verifier les comptes sensibles
- verifier les regularisations du jour ou de la periode
- verifier qu'il n'y a pas d'anomalie sur les debits et credits

Apres cloture, les corrections deviennent plus sensibles et doivent suivre une discipline stricte.

## 6.9 Methode de travail recommandee

Pour bien gerer les ecritures comptables au quotidien :

1. definir les comptes GL necessaires dans le plan comptable
2. configurer les produits avec des mappings comptables coherents
3. utiliser les ecritures manuelles seulement pour les cas non couverts
4. rechercher et verifier regulierement les transactions generees
5. corriger par regularisation plutot que par suppression logique du passe
6. preparer les clotures avec une revue des mouvements importants

## 6.10 Ce qu'il faut eviter

- utiliser None sur des produits qui doivent alimenter la comptabilite
- utiliser des comptes au hasard juste pour activer le bouton Submit
- poster une ecriture sans commentaire si le contexte est ambigu
- corriger une erreur comptable sans laisser de trace de regularisation
- faire la cloture sans revue prealable des ecritures de la periode

## 7. Mettre en place les ecritures automatiques

Oui, les ecritures comptables peuvent etre automatiques, mais il faut preparer la configuration metier et comptable.

### 7.1 Principe

Les ecritures automatiques ne se parametrent pas dans l'ecran Journal Entries.

Elles sont generees automatiquement quand :

- un produit est configure avec une comptabilite Cash ou Accrual
- les comptes obligatoires du produit sont correctement mappes
- une vraie transaction metier est executee sur un compte ou un contrat base sur ce produit

Autrement dit :

- on configure d'abord le produit
- ensuite on utilise le produit
- Fineract genere les ecritures au moment de l'operation

### 7.2 Etapes de mise en place

#### Etape 1 - Preparer le plan comptable

Creer ou verifier les comptes GL necessaires :

- comptes de passif pour l'epargne
- comptes de suspense
- comptes de produits
- comptes de charges
- comptes d'actif si necessaire

Exemple utilise dans ce guide :

- 251001 Epargne - Compte de controle FCFA
- 251002 Epargne - Transferts en suspense FCFA

#### Etape 2 - Activer la devise

La devise du produit doit etre active dans :

- Organization
- Currency Configuration
- Manage Currencies

#### Etape 3 - Creer le produit avec comptabilite

Dans le produit :

- ne pas choisir None
- choisir Cash ou Accrual selon le besoin
- renseigner tous les comptes demandes dans l'etape ACCOUNTING

Pour un produit d'epargne simple, Cash est souvent le point de depart le plus facile.

#### Etape 4 - Creer un vrai compte client sur ce produit

Le produit seul ne poste pas encore d'ecritures.

Il faut ensuite :

- creer un compte d'epargne client base sur ce produit
- approuver si le workflow l'exige
- activer le compte si le workflow l'exige

#### Etape 5 - Executer une transaction metier

Par exemple :

- depot
- retrait
- frais
- calcul ou versement d'interets
- transfert

C'est cette action metier qui declenche la comptabilisation automatique.

#### Etape 6 - Verifier les ecritures generees

Aller dans :

- Accounting
- Journal Entries

Puis filtrer par :

- date
- compte GL
- transaction ID
- type d'entree

### 7.3 Exemple concret

Cas : depot sur un compte d'epargne rattache au produit FCFA.

Scenario attendu :

- l'utilisateur effectue un depot sur le compte d'epargne
- Fineract enregistre l'operation metier
- Fineract genere automatiquement les ecritures selon le mapping du produit

En pratique, le schema exact depend du parametre comptable et du type d'operation, mais l'idee est :

- un compte est debite
- un autre est credite
- l'ecriture est visible dans Journal Entries

### 7.4 Ce qu'il faut configurer en plus selon les cas

Selon le niveau de sophistication voulu, il peut aussi etre utile de configurer :

- Financial Activity Mappings
- Accounting Rules
- Frequent Postings pour les cas repetitifs manuels
- Closing Entries pour la cloture periodique

### 7.5 Resume pratique

Pour mettre en place l'automatique :

1. preparer les comptes GL
2. activer la devise
3. creer le produit avec Cash ou Accrual
4. mapper correctement les comptes comptables du produit
5. creer un compte reel base sur ce produit
6. faire une transaction reelle
7. verifier les Journal Entries generees

### 7.6 Point cle

Le produit est le moteur de la comptabilisation automatique.

Si le produit est mal mappe :

- les ecritures ne sortent pas correctement
- ou certaines operations ne pourront pas etre comptabilisees proprement

Si le produit est bien mappe :

- les transactions du cycle de vie du compte peuvent alimenter automatiquement la comptabilite.
