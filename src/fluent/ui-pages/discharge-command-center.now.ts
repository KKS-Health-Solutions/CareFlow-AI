import '@servicenow/sdk/global';
import { UiPage } from '@servicenow/sdk/core';
import dashboardPage from '../../client/dashboard.html';

export const discharge_command_center = UiPage({
  $id: Now.ID['discharge-command-center'],
  endpoint: 'discharge_command_center.do',
  description: 'Discharge & Follow-Up Command Center - Role-based dashboard for managing patient discharge cases',
  category: 'general',
  html: dashboardPage,
  direct: true
});