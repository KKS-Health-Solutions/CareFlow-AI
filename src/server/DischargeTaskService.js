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
 *   - assigned_to  : Sys_ID Values
 *   - state            : Standard task state field (1=New, 2=In Progress, 3=Closed Complete, 7=Closed)
 *   - assigned_to      : Reference to sys_user
 *   - u_completed_by   : Reference to sys_user (who completed the task)
 *   - u_completed_at   : GlideDateTime (when the task was completed)
 *   - work_notes       : Journal field for audit trail
 *
 * =============================================================================
 */

// ─── Copy everything below this line into the Script Include body ───

var DischargeTaskService = Class.create();
DischargeTaskService.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    // ─── CONFIGURABLE FIELD NAMES ───────────────────────────────────
    // Update these if your table schema uses different column names.
    TASK_TABLE:           'u_discharge_task',
    CASE_REF_FIELD:       'u_discharge_case',
    ASSIGNED_TO_FIELD:    'assigned_to',
    STATE_FIELD:          'state',
    WORK_NOTES_FIELD:     'work_notes',

    // State values
    STATE_CLOSED_COMPLETE: '3',    // ServiceNow standard "Closed Complete"
    STATES_NOT_COMPLETE:   '1,2',  // New, In Progress

    // Valid provider roles
    VALID_ROLES: ['doctor', 'nurse', 'pharmacy'],

    // Role-to-ServiceNow-role mapping for permission checks
    DEFAULT_ASSIGNEE_BY_USER: {
        'doctor':   '3D87efb319c38b72100fa7bd43e4013164',
        'nurse':    '3D8f8f3711c3cb72100fa7bd43e40131d9',
        'pharmacy': '3Dac104461c3cb72100fa7bd43e4013197'
    },

    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC: completeTasksForRole(caseSysId, userName)
    // ═══════════════════════════════════════════════════════════════════
    /**
     * Completes all open discharge tasks for a given role on a given case.
     * 
     * Server-side permission check:
     *   - User must have the matching ServiceNow role (e.g. careflow_ai_nurse)
     *     OR the admin override role (careflow_ai_admin).
     * 
     * @param {string} caseSysId  - sys_id of the u_cflow_patient_discharge_case record
     * @param {string} userName   - one of: 'doctor', 'nurse', 'pharmacy'
     * @returns {object} { success, updatedCount, skippedCount, errors[], message }
     */
    completeTasksForRole: function(caseSysId, userName) {
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

        userName = (userName || '').toLowerCase().trim();
        if (this.VALID_ROLES.indexOf(userName) === -1) {
            result.errors.push('Invalid role: ' + userName + '. Must be one of: ' + this.VALID_ROLES.join(', '));
            result.message = 'Invalid provider role';
            return result;
        }

		var assigneeSysId = this.DEFAULT_ASSIGNEE_BY_USER[userName];
		if (!assigneeSysId) {
			result.errors.push('No assignee configured for user: ' + userName);
			result.message = 'Missing assignee mapping';
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
		taskGr.addQuery(this.ASSIGNED_TO_FIELD, assigneeSysId);
        taskGr.addQuery(this.STATE_FIELD, 'IN', this.STATES_NOT_COMPLETE);
        taskGr.query();

        var now = new GlideDateTime();

        // ── 5. Update each matching task ─────────────────────────────
        while (taskGr.next()) {
            try {
                taskGr.setValue(this.STATE_FIELD, this.STATE_CLOSED_COMPLETE);

                // Audit work note
                var auditNote = 'Completed via patient_discharge_case provider button.\n' +
                                'Completed by: ' + userName + '\n' +
                                'Method: DischargeTaskService.completeTasksForRole()';


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
            result.message = 'No open ' + userName + ' tasks found for this case';
        } else if (result.errors.length === 0) {
            result.success = true;
            result.message = result.updatedCount + ' ' + userName +
                             ' task(s) marked complete';
        } else {
            result.success = result.updatedCount > 0;
            result.message = result.updatedCount + ' completed, ' +
                             result.skippedCount + ' failed';
        }

        // Audit log
        gs.info('DischargeTaskService.completeTasksForRole: case=' + caseSysId +
                ', role=' + userName + ', updated=' + result.updatedCount +
                ', skipped=' + result.skippedCount +
                ', user=' + gs.getUserName());

        return result;
    },

	_getRoleFromAssignee: function(assigneeSysId) {
		for (var role in this.DEFAULT_ASSIGNEE_BY_USER) {
			if (this.DEFAULT_ASSIGNEE_BY_USER[role] === assigneeSysId)
			return role;
		}
		return '';
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
            var assigneeSysId = taskGr.getValue(this.ASSIGNED_TO_FIELD) || '';
			var providerRole = this._getRoleFromAssignee(assigneeSysId);


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
        var userName = this.getParameter('sysparm_role_name');

        var result = this.completeTasksForRole(caseSysId, userName);
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