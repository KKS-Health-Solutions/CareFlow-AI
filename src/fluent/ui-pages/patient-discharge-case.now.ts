import '@servicenow/sdk/global';
import { UiPage } from '@servicenow/sdk/core';

export const patient_discharge_case = UiPage({
  $id: Now.ID['patient-discharge-case'],
  name: 'patient_discharge_case',
  endpoint: 'patient_discharge_case.do',
  description: 'Patient Discharge Case workspace - Detailed case management with role-based actions',
  category: 'general',
  html: `<html>
<head>
  <title>Patient Discharge Case</title>
  <sdk:now-ux-globals></sdk:now-ux-globals>
  <script src="/uxasset/externals/global/case-main.jsdbx" type="module"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
  direct: true
});