export interface KycCaseData {
  id: number;
  clientId: number;
  clientName: string;
  tier?: { id: number; name: string };
  workflowStatusId: number;
  workflowStatusCode: string;
  workflowStatusValue: string;
  assignedAgentId?: number;
  assignedAgentName?: string;
  assignedDate?: string;
  assignmentStatusId: number;
  assignmentStatusCode: string;
  assignmentStatusValue: string;
  riskLevelId?: number;
  riskLevelCode?: string;
  riskLevelValue?: string;
  riskScore?: number;
  riskReason?: string;
  flags?: any[];
  escalationReason?: string;
  complianceNotes?: string;
  nextReviewDate?: string;
  documents?: any[];
  requiredDocumentCount: number;
  submittedDocumentCount: number;
  completionPercentage: number;
  createdDate?: string;
  createdByUsername?: string;
  lastModifiedDate?: string;
  lastModifiedByUsername?: string;
}

export interface KycCaseHistoryData {
  id: number;
  kycCaseId: number;
  fromStatusId?: number;
  fromStatusValue?: string;
  toStatusId: number;
  toStatusValue: string;
  fromAssignmentStatusId?: number;
  fromAssignmentStatusValue?: string;
  toAssignmentStatusId?: number;
  toAssignmentStatusValue?: string;
  comments?: string;
  actorUsername?: string;
  createdDate: string;
}

export interface KycAuditLogData {
  id: number;
  entityType: string;
  action: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  comments?: string;
  actorUsername?: string;
  createdDate: string;
}

export interface KycDashboardStatsData {
  totalCases: number;
  initiatedCases: number;
  docsPendingCases: number;
  docsReceivedCases: number;
  verificationInProgressCases: number;
  pendingApprovalCases: number;
  approvedCases: number;
  rejectedCases: number;
  unassignedCases: number;
  assignedCases: number;
  inReviewCases: number;
  escalatedCases: number;
  lowRiskCases: number;
  mediumRiskCases: number;
  highRiskCases: number;
  criticalRiskCases: number;
}

export const KycWorkflowStatusMap: { [value: number]: { label: string, color: string } } = {
  100: { label: 'Pending', color: 'warn' },
  200: { label: 'Compliant', color: 'primary' },
  300: { label: 'In Review', color: 'accent' },
  400: { label: 'Enhanced (EDD)', color: 'warn' },
  500: { label: 'Rejected', color: 'warn' },
  600: { label: 'Closed', color: 'basic' }
};

export const KycAssignmentStatusMap: { [value: number]: { label: string, icon: string } } = {
  100: { label: 'Unassigned', icon: 'user-slash' },
  200: { label: 'Assigned', icon: 'user' },
  300: { label: 'In Review', icon: 'tasks' },
  400: { label: 'Escalated', icon: 'exclamation-triangle' }
};

export const KycRiskLevelMap: { [value: number]: { label: string, class: string } } = {
  100: { label: 'Low', class: 'risk-low' },
  200: { label: 'Medium', class: 'risk-medium' },
  300: { label: 'High', class: 'risk-high' },
  400: { label: 'Critical', class: 'risk-critical' }
};
