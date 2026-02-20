/**
 * HIPAA Audit Logging
 * Server-side only — logs PHI access to AuditLog table
 */

import { prisma } from '@/lib/prisma';

export interface AuditLogEntry {
  userId?: string;
  userEmail: string;
  userRole: string;
  clinicId?: string;
  actionType: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  resourceType: string;
  resourceId?: string;
  phiFieldsAccessed?: string[];
  hasPhi?: boolean;
  details?: string;
}

/**
 * Log a PHI access event to the audit log
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        userEmail: entry.userEmail,
        userRole: entry.userRole,
        clinicId: entry.clinicId,
        actionType: entry.actionType,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        phiFieldsAccessed: entry.phiFieldsAccessed || [],
        hasPhi: entry.hasPhi || (entry.phiFieldsAccessed && entry.phiFieldsAccessed.length > 0) || false,
        details: entry.details,
      },
    });
  } catch (error) {
    // Audit logging failures should not break the main flow
    // but should be monitored
    console.error('AUDIT LOG FAILURE:', error);
  }
}

/**
 * Log prescription access
 */
export async function logPrescriptionAccess(
  userId: string | undefined,
  userEmail: string,
  userRole: string,
  clinicId: string | undefined,
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
  prescriptionId?: string,
  details?: string
): Promise<void> {
  await logAudit({
    userId,
    userEmail,
    userRole,
    clinicId,
    actionType: action,
    resourceType: 'Prescription',
    resourceId: prescriptionId,
    phiFieldsAccessed: ['medicationName', 'medicationStrength', 'directions', 'providerName', 'providerNpi'],
    hasPhi: true,
    details,
  });
}

/**
 * Log patient access
 */
export async function logPatientAccess(
  userId: string | undefined,
  userEmail: string,
  userRole: string,
  clinicId: string | undefined,
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
  patientId?: string,
  details?: string
): Promise<void> {
  await logAudit({
    userId,
    userEmail,
    userRole,
    clinicId,
    actionType: action,
    resourceType: 'Patient',
    resourceId: patientId,
    phiFieldsAccessed: ['firstName', 'lastName', 'dateOfBirth', 'phone', 'email', 'streetAddress'],
    hasPhi: true,
    details,
  });
}
