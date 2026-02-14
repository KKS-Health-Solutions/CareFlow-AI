/**
 * =============================================================================
 * ACL & Business Rule Configuration for Role-Based Discharge Task Completion
 * =============================================================================
 * 
 * This file documents the ServiceNow platform records you need to create
 * to enforce server-side RBAC for the discharge task completion feature.
 * 
 * OVERVIEW OF CHANGES:
 * ────────────────────
 * PROBLEM:  Nurse could click "Complete Discharge Tasks" and mark ALL tasks
 *           (including Doctor and Pharmacy tasks) as complete.
 * 
 * SOLUTION: 3-layer enforcement:
 *   1. UI layer   → Each role sees only their own "Mark my tasks complete" button
 *   2. REST API   → New endpoint validates role_name and delegates to Script Include
 *   3. Server     → Script Include checks gs.hasRole() before updating any records
 * 
 * =============================================================================
 * 
 * 
 * 1. SCRIPT INCLUDE
 * ─────────────────
 * File: src/server/DischargeTaskService.js
 * 
 * Where to create in ServiceNow:
 *   Navigate to: System Definition > Script Includes
 *   
 *   Name:             DischargeTaskService
 *   API Name:         x_careflow_ai.DischargeTaskService
 *   Client Callable:  true
 *   Description:      Server-side service for role-scoped discharge task completion.
 *                     Enforces RBAC via gs.hasRole() checks.
 *   Script:           <paste contents of src/server/DischargeTaskService.js>
 * 
 * 
 * 2. SCRIPTED REST API RESOURCES (add to existing API)
 * ────────────────────────────────────────────────────
 * File: src/server/DischargeTaskAPI.js
 * 
 * Navigate to: System Web Services > Scripted REST APIs
 * Open: "Patient Discharge Case API" (scope: x_careflow_ai, api_id: 728557)
 * 
 * Resource A: Complete Tasks for Role
 *   Name:            Complete Discharge Tasks for Role
 *   HTTP Method:     POST
 *   Relative Path:   /discharge_case/{case_sys_id}/complete_tasks
 *   Script:          <paste Resource 1 from DischargeTaskAPI.js>
 * 
 * Resource B: Get Task Summary by Role
 *   Name:            Get Task Summary by Role
 *   HTTP Method:     GET
 *   Relative Path:   /discharge_case/{case_sys_id}/task_summary
 *   Script:          <paste Resource 2 (uncommented) from DischargeTaskAPI.js>
 * 
 * 
 * 3. ACL RECORDS
 * ──────────────
 * The existing ACL x_careflow_ai.api.default already covers the Scripted REST API.
 * However, add these additional field-level ACLs on the u_discharge_task table
 * to prevent direct Table API bypasses:
 * 
 * ACL A: Prevent direct state changes to tasks not owned by the user's role
 *   Type:              Record
 *   Operation:         Write
 *   Table:             u_discharge_task
 *   Condition:         (leave empty - handled by script)
 *   Script:
 *     ──────────────────────────────────────────────────────
 *     // Allow write if:
 *     //   1. User has admin override role, OR
 *     //   2. Task's provider_role matches user's CareFlow role, OR
 *     //   3. The state field is NOT being changed (non-state edits are OK)
 *     
 *     var isAdmin = gs.hasRole('x_careflow_ai.careflow_ai_admin');
 *     
 *     if (isAdmin) {
 *         answer = true;
 *     } else {
 *         var taskRole = current.getValue('u_provider_role');
 *         var roleMap = {
 *             'doctor':   'x_careflow_ai.careflow_ai_doctor',
 *             'nurse':    'x_careflow_ai.careflow_ai_nurse',
 *             'pharmacy': 'x_careflow_ai.careflow_ai_pharmacy'
 *         };
 *         
 *         var requiredRole = roleMap[taskRole];
 *         if (!requiredRole) {
 *             answer = true; // Unknown role = allow (fail-open for untagged tasks)
 *         } else if (current.state.changes()) {
 *             // State is changing → user MUST have the matching role
 *             answer = gs.hasRole(requiredRole);
 *         } else {
 *             // Non-state fields changing → allow
 *             answer = true;
 *         }
 *     }
 *     ──────────────────────────────────────────────────────
 *   
 *   Requires Role:     (leave empty - script handles it)
 * 
 * 
 * 4. BUSINESS RULE (optional, extra safety net)
 * ──────────────────────────────────────────────
 * Name:       Enforce Role on Discharge Task State Change
 * Table:      u_discharge_task
 * When:       Before Update
 * Condition:  current.state.changes()
 * Script:
 *   ──────────────────────────────────────────────────────
 *   (function executeRule(current, previous) {
 *       
 *       // Skip check for admins
 *       if (gs.hasRole('x_careflow_ai.careflow_ai_admin')) return;
 *       
 *       var taskRole = current.getValue('u_provider_role');
 *       var roleMap = {
 *           'doctor':   'x_careflow_ai.careflow_ai_doctor',
 *           'nurse':    'x_careflow_ai.careflow_ai_nurse',
 *           'pharmacy': 'x_careflow_ai.careflow_ai_pharmacy'
 *       };
 *       
 *       var requiredRole = roleMap[taskRole];
 *       if (requiredRole && !gs.hasRole(requiredRole)) {
 *           gs.addErrorMessage(
 *               'You do not have permission to change the state of ' +
 *               taskRole + ' tasks. Required role: ' + requiredRole
 *           );
 *           current.setAbortAction(true);
 *       }
 *       
 *   })(current, previous);
 *   ──────────────────────────────────────────────────────
 * 
 * 
 * 5. FIELD REQUIREMENTS (TODO - verify these exist)
 * ──────────────────────────────────────────────────
 * The following fields are assumed to exist on u_discharge_task.
 * If any are missing, create them:
 * 
 * | Field Label       | Column Name      | Type              | Notes                          |
 * |-------------------|------------------|-------------------|--------------------------------|
 * | Provider Role     | u_provider_role  | Choice (String)   | Values: doctor, nurse, pharmacy|
 * | Completed By      | u_completed_by   | Reference (User)  | sys_user reference             |
 * | Completed At      | u_completed_at   | Date/Time         | GlideDateTime                  |
 * | Discharge Case    | u_discharge_case | Reference          | → u_cflow_patient_discharge_case|
 * | State             | state            | Integer (Choice)  | 1=New, 2=InProg, 3=Closed      |
 * | Work Notes        | work_notes       | Journal            | Standard journal field         |
 * 
 * If u_provider_role does NOT exist yet:
 *   Navigate to: u_discharge_task > Configure > Form Layout
 *   Add new field:
 *     Label:    Provider Role
 *     Name:     u_provider_role
 *     Type:     Choice
 *     Choices:  doctor, nurse, pharmacy
 *   
 *   Then backfill existing tasks with the correct role based on their
 *   short_description or assignment group.
 * 
 * 
 * 6. ROLES SUMMARY
 * ────────────────
 * These roles were created in Ticket 1. Verify they exist:
 * 
 * | Role Name                        | Used For                            |
 * |----------------------------------|-------------------------------------|
 * | x_careflow_ai.careflow_ai_admin  | Admin override - can complete any   |
 * | x_careflow_ai.careflow_ai_doctor | Complete doctor discharge tasks     |
 * | x_careflow_ai.careflow_ai_nurse  | Complete nurse discharge tasks      |
 * | x_careflow_ai.careflow_ai_pharmacy | Complete pharmacy discharge tasks |
 * 
 * 
 * 7. FILE PLACEMENT SUMMARY
 * ─────────────────────────
 * 
 * | File                                              | ServiceNow Location                    |
 * |---------------------------------------------------|----------------------------------------|
 * | src/server/DischargeTaskService.js                 | Script Include                         |
 * | src/server/DischargeTaskAPI.js                     | Scripted REST API Resources (×2)       |
 * | src/client/services/DischargeCaseService.js        | UI Page client script (bundled React)  |
 * | src/client/components/CaseWorkspace.jsx            | UI Page client script (bundled React)  |
 * | src/client/components/CaseWorkspace.css            | UI Page style (bundled React)          |
 * | src/server/ACL_AND_DEPLOYMENT.js (this file)       | Reference only − not deployed          |
 * 
 */
