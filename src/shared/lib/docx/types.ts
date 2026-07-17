/** @license SPDX-License-Identifier: Apache-2.0 */

export interface BuildDocxParams {
  docType: 'amonestacion' | 'compromiso_conductual' | 'derivacion';
  studentName: string;
  studentRut: string;
  course: string;
  teacher: string;
  apoderadoName: string;
  coordinatorName?: string;
  dateStr: string;
  negativeCount: number;
  observations: string;
  customCommitments?: string[];
  annotations?: Array<{ text: string; date: string; severity: string }>;
  logoBytes?: Uint8Array;
}
