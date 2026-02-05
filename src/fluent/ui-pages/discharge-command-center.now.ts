import '@servicenow/sdk/global';
import { UiPage } from '@servicenow/sdk/core';

export const discharge_command_center = UiPage({
  $id: Now.ID['discharge-command-center'],
  name: 'discharge_command_center',
  endpoint: 'discharge_command_center.do',
  description: 'Discharge & Follow-Up Command Center - Role-based dashboard for managing patient discharge cases',
  category: 'general',
  html: Now.include('../../client/dashboard.html'),
  direct: true
});