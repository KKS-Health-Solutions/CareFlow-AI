import '@servicenow/sdk/global';
import { UiPage } from '@servicenow/sdk/core';
import casePage from '../../client/case-workspace.html';

export const patient_discharge_case = UiPage({
  $id: Now.ID['patient-discharge-case'],
  endpoint: 'patient_discharge_case.do',
  description: 'Patient Discharge Case workspace - Detailed case management with role-based actions',
  category: 'general',
  html: casePage,
  direct: true
});