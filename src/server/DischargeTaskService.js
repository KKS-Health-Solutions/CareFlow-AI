/**
 * =============================================================================
 * DischargeTaskService - Server-Side Script Include
 * =============================================================================
 * 
 * WHERE TO PLACE IN SERVICENOW:
 *   System Definition > Script Includes
 *   Name:        DischargeTaskService
 *   API Name:    global.DischargeTaskService (or x_careflow_ai.DischargeTaskService if scoped)
 *   Client Callable: true  (needed for GlideAjax fallback)
 *   Accessible from: All application scopes
 * 
 * PURPOSE:
 *   Server-side enforcement of role-based discharge task completion.
 *   Nurses can only complete nurse tasks, Doctors only doctor tasks, etc.
 *   Only the discharge_admin role can override and complete any role's tasks.
 * 
 * TABLES USED:
 *   - u_cflow_patient_discharge_case  (main case table)
 *   - u_discharge_task                (child task table, ref: u_discharge_case)
 * 
 * FIELD ASSUMPTIONS ON u_discharge_task:
 *   - u_discharge_case : Reference to u_cflow_patient_discharge_case
 *   - u_provider_role  : String/Choice field. Values: 'doctor', 'nurse', 'pharmacy'
 *   - state            : Standard task state field (1=New, 2=In Progress, 3=Closed Complete, 7=Closed)
 *   - assigned_to      : Reference to sys_user
 *   - u_completed_by   : Reference to sys_user (who completed the task)
 *   - u_completed_at   : GlideDateTime (when the task was completed)
 *   - work_notes       : Journal field for audit trail
 *
 * TODO: Verify the following field names exist on your u_discharge_task table:
 *   - u_provider_role  (if named differently, update PROVIDER_ROLE_FIELD below)
 *   - u_completed_by   (if named differently, update COMPLETED_BY_FIELD below)
 *   - u_completed_at   (if named differently, update COMPLETED_AT_FIELD below)
 * =============================================================================
 */

// ─── Copy everything below this line into the Script Include body ───

var DischargeTaskService = Class.create();
DischargeTaskService.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    // ─── CONFIGURABLE FIELD NAMES ───────────────────────────────────
    // Update these if your table schema uses different column names.
    TASK_TABLE:           'u_discharge_task',
    CASE_REF_FIELD:       'u_discharge_case',
    PROVIDER_ROLE_FIELD:  'u_provider_role',      // TODO: confirm field name
    STATE_FIELD:          'state',
    COMPLETED_BY_FIELD:   'u_completed_by',       // TODO: confirm field name
    COMPLETED_AT_FIELD:   'u_completed_at',       // TODO: confirm field name
    WORK_NOTES_FIELD:     'work_notes',

    // State values
    STATE_CLOSED_COMPLETE: '3',    // ServiceNow standard "Closed Complete"
    STATES_NOT_COMPLETE:   '1,2',  // New, In Progress

    // Valid provider roles
    VALID_ROLES: ['doctor', 'nurse', 'pharmacy'],

    // Admin override role (can complete ANY role's tasks)
    ADMIN_ROLE: 'x_careflow_ai.careflow_ai_admin',

    // Role-to-ServiceNow-role mapping for permission checks
    ROLE_MAP: {
        'doctor':   'x_careflow_ai.careflow_ai_doctor',
        'nurse':    'x_careflow_ai.careflow_ai_nurse',
        'pharmacy': 'x_careflow_ai.careflow_ai_pharmacy'
    },

    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC: completeTasksForRole(caseSysId, roleName)
    // ═══════════════════════════════════════════════════════════════════
    /**
     * Completes all open discharge tasks for a given role on a given case.
     * 
     * Server-side permission check:
     *   - User must have the matching ServiceNow role (e.g. careflow_ai_nurse)
     *     OR the admin override role (careflow_ai_admin).
     * 
     * @param {string} caseSysId  - sys_id of the u_cflow_patient_discharge_case record
     * @param {string} roleName   - one of: 'doctor', 'nurse', 'pharmacy'
     * @returns {object} { success, updatedCount, skippedCount, errors[], message }
     */
    completeTasksForRole: function(caseSysId, roleName) {
        var result = {
            success: false,
            updatedCount: 0,
            skippedCount: 0,
            errors: [],
            message: ''
        };

        // ── 1. Input validation ──────────────────────────────────────
        if (!caseSysId) {
            result.errors.push('caseSysId is required');
            result.message = 'Missing case sys_id';
            return result;
        }

        roleName = (roleName || '').toLowerCase().trim();
        if (this.VALID_ROLES.indexOf(roleName) === -1) {
            result.errors.push('Invalid role: ' + roleName + '. Must be one of: ' + this.VALID_ROLES.join(', '));
            result.message = 'Invalid provider role';
            return result;
        }

        // ── 2. Permission check (SERVER-SIDE ENFORCEMENT) ───────────
        var currentUser = gs.getUserID();
        var requiredRole = this.ROLE_MAP[roleName];
        var hasRequiredRole = gs.hasRole(requiredRole);
        var hasAdminOverride = gs.hasRole(this.ADMIN_ROLE);

        if (!hasRequiredRole && !hasAdminOverride) {
            result.errors.push(
                'Access denied. User ' + gs.getUserName() +
                ' does not have role ' + requiredRole +
                ' or admin override ' + this.ADMIN_ROLE
            );
            result.message = 'Permission denied: you do not have the ' + roleName + ' role';
            gs.warn('DischargeTaskService: RBAC violation - user ' + gs.getUserName() +
                     ' attempted to complete ' + roleName + ' tasks on case ' + caseSysId);
            return result;
        }

        // ── 3. Verify the case exists ────────────────────────────────
        var caseGr = new GlideRecord('u_cflow_patient_discharge_case');
        if (!caseGr.get(caseSysId)) {
            result.errors.push('Discharge case not found: ' + caseSysId);
            result.message = 'Case not found';
            return result;
        }

        // ── 4. Query open tasks for the specified role ───────────────
        var taskGr = new GlideRecord(this.TASK_TABLE);
        taskGr.addQuery(this.CASE_REF_FIELD, caseSysId);
        taskGr.addQuery(this.PROVIDER_ROLE_FIELD, roleName);
        taskGr.addQuery(this.STATE_FIELD, 'IN', this.STATES_NOT_COMPLETE);
        taskGr.query();

        var now = new GlideDateTime();

        // ── 5. Update each matching task ─────────────────────────────
        while (taskGr.next()) {
            try {
                taskGr.setValue(this.STATE_FIELD, this.STATE_CLOSED_COMPLETE);
                taskGr.setValue(this.COMPLETED_BY_FIELD, currentUser);
                taskGr.setValue(this.COMPLETED_AT_FIELD, now);

                // Audit work note
                var auditNote = 'Completed via patient_discharge_case provider button.\n' +
                                'Role: ' + roleName + '\n' +
                                'Completed by: ' + gs.getUserDisplayName() + '\n' +
                                'Method: DischargeTaskService.completeTasksForRole()';

                if (hasAdminOverride && !hasRequiredRole) {
                    auditNote += '\n⚠ Admin override used (user does not hold ' + requiredRole + ' role)';
                }

                taskGr.setValue(this.WORK_NOTES_FIELD, auditNote);

                if (taskGr.update()) {
                    result.updatedCount++;
                } else {
                    result.skippedCount++;
                    result.errors.push('Failed to update task ' + taskGr.getUniqueValue() +
                                       ': ' + taskGr.getLastErrorMessage());
                }
            } catch (e) {
                result.skippedCount++;
                result.errors.push('Exception on task ' + taskGr.getUniqueValue() + ': ' + e.message);
            }
        }

        // ── 6. Check if ALL role tasks (not just open) are now complete ──
        this._updateCaseTasksCompleteFlag(caseSysId);

        // ── 7. Build result ──────────────────────────────────────────
        if (result.updatedCount === 0 && result.skippedCount === 0) {
            result.success = true;
            result.message = 'No open ' + roleName + ' tasks found for this case';
        } else if (result.errors.length === 0) {
            result.success = true;
            result.message = result.updatedCount + ' ' + roleName +
                             ' task(s) marked complete';
        } else {
            result.success = result.updatedCount > 0;
            result.message = result.updatedCount + ' completed, ' +
                             result.skippedCount + ' failed';
        }

        // Audit log
        gs.info('DischargeTaskService.completeTasksForRole: case=' + caseSysId +
                ', role=' + roleName + ', updated=' + result.updatedCount +
                ', skipped=' + result.skippedCount +
                ', user=' + gs.getUserName());

        return result;
    },

    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC: getTaskSummaryByRole(caseSysId)
    // ═══════════════════════════════════════════════════════════════════
    /**
     * Returns a breakdown of task counts per role for a discharge case.
     * Used by the UI to show per-role task completion status.
     * 
     * @param {string} caseSysId
     * @returns {object} { doctor: {total, open, complete}, nurse: {...}, pharmacy: {...} }
     */
    getTaskSummaryByRole: function(caseSysId) {
        var summary = {};
        for (var i = 0; i < this.VALID_ROLES.length; i++) {
            var role = this.VALID_ROLES[i];
            summary[role] = { total: 0, open: 0, complete: 0 };
        }

        if (!caseSysId) return summary;

        var taskGr = new GlideRecord(this.TASK_TABLE);
        taskGr.addQuery(this.CASE_REF_FIELD, caseSysId);
        taskGr.query();

        while (taskGr.next()) {
            var providerRole = taskGr.getValue(this.PROVIDER_ROLE_FIELD) || '';
            providerRole = providerRole.toLowerCase().trim();

            if (summary.hasOwnProperty(providerRole)) {
                summary[providerRole].total++;
                var state = taskGr.getValue(this.STATE_FIELD);
                if (state === this.STATE_CLOSED_COMPLETE || state === '7') {
                    summary[providerRole].complete++;
                } else {
                    summary[providerRole].open++;
                }
            }
        }

        return summary;
    },

    // ═══════════════════════════════════════════════════════════════════
    // PRIVATE: _updateCaseTasksCompleteFlag(caseSysId)
    // ═══════════════════════════════════════════════════════════════════
    /**
     * After completing tasks, check if ALL tasks for this case are now
     * complete. If so, set u_tasks_complete = true on the case.
     */
    _updateCaseTasksCompleteFlag: function(caseSysId) {
        var openCount = new GlideAggregate(this.TASK_TABLE);
        openCount.addQuery(this.CASE_REF_FIELD, caseSysId);
        openCount.addQuery(this.STATE_FIELD, 'IN', this.STATES_NOT_COMPLETE);
        openCount.addAggregate('COUNT');
        openCount.query();

        var remaining = 0;
        if (openCount.next()) {
            remaining = parseInt(openCount.getAggregate('COUNT'), 10);
        }

        var caseGr = new GlideRecord('u_cflow_patient_discharge_case');
        if (caseGr.get(caseSysId)) {
            caseGr.setValue('u_tasks_complete', remaining === 0);
            caseGr.update();
        }
    },

    // ═══════════════════════════════════════════════════════════════════
    // GlideAjax entry point (if used as client-callable Script Include)
    // ═══════════════════════════════════════════════════════════════════
    /**
     * Called via GlideAjax from a UI Action or Client Script.
     * Expects sysparm_case_sys_id and sysparm_role_name.
     */
    ajaxCompleteTasksForRole: function() {
        var caseSysId = this.getParameter('sysparm_case_sys_id');
        var roleName = this.getParameter('sysparm_role_name');

        var result = this.completeTasksForRole(caseSysId, roleName);
        return JSON.stringify(result);
    },

    /**
     * Called via GlideAjax to get task summary by role.
     * Expects sysparm_case_sys_id.
     */
    ajaxGetTaskSummaryByRole: function() {
        var caseSysId = this.getParameter('sysparm_case_sys_id');
        var result = this.getTaskSummaryByRole(caseSysId);
        return JSON.stringify(result);
    },

    type: 'DischargeTaskService'
});
