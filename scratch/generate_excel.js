const fs = require('fs');
const XLSX = require('xlsx');

// 1. Lire le fichier JSON
const rawData = fs.readFileSync('../src/assets/united_credit_seed_data.json');
const seedData = JSON.parse(rawData);

// 2. Créer un nouveau classeur
const wb = XLSX.utils.book_new();

// -- Devises --
if (seedData.currencies && seedData.currencies.activate) {
  const devises = seedData.currencies.activate.map(c => ({ Code_Devise: c }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(devises), 'Devises');
}

// -- Agences --
const agences = seedData.offices.map(o => ({
  Code: o.code,
  Nom: o.name,
  Ville: o.city || '',
  Region: o.region || '',
  Parent: o.parent || '',
  Role: o.role || ''
}));
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(agences), 'Agences');

// -- Roles --
if (seedData.roles) {
  const roles = seedData.roles.map(r => ({
    Nom: r.name,
    Description: r.description,
    Permissions: r.permissions ? r.permissions[0] : ''
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(roles), 'Roles');
}

// -- Personnel (Staff) --
if (seedData.staff) {
  const staff = seedData.staff.map(s => ({
    Prenom: s.firstname,
    Nom: s.lastname,
    Code_Agence: s.officeCode,
    ID_Externe: s.externalId,
    Is_Loan_Officer: s.isLoanOfficer,
    Actif: s.isActive
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staff), 'Personnel');
}

// -- Utilisateurs (Users) --
if (seedData.users) {
  const users = seedData.users.map(u => ({
    Username: u.username,
    Nom_Role: u.roleName,
    ID_Staff: u.staffExternalId
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(users), 'Utilisateurs');
}

// -- GL Accounts --
if (seedData.gl_accounts) {
  if (seedData.gl_accounts.headers) {
    const glHeaders = seedData.gl_accounts.headers.map(h => ({
      Code: h.code,
      Nom: h.name,
      Type: h.type,
      Parent: h.parent || ''
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(glHeaders), 'GL_Headers');
  }
  
  if (seedData.gl_accounts.details) {
    const glDetails = seedData.gl_accounts.details.map(d => ({
      Code: d.code,
      Nom: d.name,
      Type: d.type,
      Parent: d.parent || ''
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(glDetails), 'GL_Details');
  }
}

// -- Caisses --
const caisses = seedData.tellers.map(t => ({
  Code_Agence: t.office,
  Nom_Caisse: t.name,
  Limite_Cash_XAF: t.cash_limit_xaf,
  Devises_Gerees: t.currencies.join(', ')
}));
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(caisses), 'Caisses');

// -- Produits Épargne --
const epargnes = seedData.savings_products.map(s => ({
  Nom_Produit: s.name,
  Taux_Annuel_Pct: s.rate_annual_pct,
  Solde_Min_XAF: s.min_balance_xaf,
  Frequence_Interets: s.compounding
}));
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(epargnes), 'Produits_Epargne');

// -- Produits Prêt --
const prets = seedData.loan_products.map(p => ({
  Nom_Produit: p.name,
  Cible: p.target,
  Min_XAF: p.min_xaf,
  Max_XAF: p.max_xaf,
  Duree_Min_Mois: p.duration_months_min,
  Duree_Max_Mois: p.duration_months_max,
  Taux_Annuel_Pct: p.rate_annual_pct,
  Modalite: p.modality
}));
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prets), 'Produits_Pret');

// -- Clients --
const clients = seedData.clients.map(c => ({
  ID_Client: c.id,
  Nom_Complet: c.name,
  Type: c.type,
  Code_Agence: c.office,
  Profession: c.profession,
  Statut_KYC: c.kyc_status,
  Risque: c.risk
}));
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clients), 'Clients');

// 3. Sauvegarder le fichier Excel
XLSX.writeFile(wb, 'Setup_Complet.xlsx');
console.log('Fichier Setup_Complet.xlsx généré avec succès !');
