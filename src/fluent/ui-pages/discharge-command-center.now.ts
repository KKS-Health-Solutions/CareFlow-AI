import '@servicenow/sdk/global';
import { UiPage } from '@servicenow/sdk/core';

export const discharge_command_center = UiPage({
  $id: Now.ID['discharge-command-center'],
  name: 'discharge_command_center',
  endpoint: 'discharge_command_center.do',
  description: 'Discharge & Follow-Up Command Center - Role-based dashboard for managing patient discharge cases',
  category: 'general',
  html: `<html>
<head>
  <title>Discharge &amp; Follow-Up Command Center</title>
  <sdk:now-ux-globals></sdk:now-ux-globals>
  <script src="/uxasset/externals/global/dashboard-main.jsdbx" type="module"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
  direct: true
});