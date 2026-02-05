import '@servicenow/sdk/global';
import { UiPage } from '@servicenow/sdk/core';

export const patient_discharge_case = UiPage({
  $id: Now.ID['patient-discharge-case'],
  name: 'patient_discharge_case',
  endpoint: 'patient_discharge_case.do',
  description: 'Patient Discharge Case workspace - Detailed case management with role-based actions',
  category: 'general',
  html: Now.include('../../client/case-workspace.html'),
  direct: true
});