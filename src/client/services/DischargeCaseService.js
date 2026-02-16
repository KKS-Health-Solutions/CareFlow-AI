export class DischargeCaseService {
  constructor() {
    this.dischargeCaseTable = "u_cflow_patient_discharge_case";
    this.dischargeSummaryTable = "u_discharge_summary";
    this.dischargeTaskTable = "u_discharge_task";
    this.commLogTable = "u_discharge_communication_log";
  }

  // Existing methods...
  async getDashboardData() {
    try {
      const response = await fetch(`/api/now/table/${this.dischargeCaseTable}?sysparm_display_value=all&sysparm_limit=100&sysparm_fields=sys_id,u_patient_name,u_hospital_number,u_ward,u_discharge_date,u_discharging_status,u_due_date,u_risk_level,u_tasks_complete,sys_updated_on`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-UserToken": window.g_ck
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }

      const { result: cases } = await response.json();
      const stats = await this.getDashboardStats();
      
      return {
        cases: cases || [],
        stats
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  async createDischargeCase(formData) {
      try {
        const response = await fetch('/api/728557/careflow_ai_patient_discharge_case_api/discharge_case',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              "X-UserToken": window.g_ck
            },
            body: JSON.stringify(formData)
          
          });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        return result;
      } catch (error) {
        console.error('Error creating discharge case:', error.message);
        throw error;
      }
  } 

  // Pharmacy-specific methods
  async getPharmacyTasks() {
    try {
      // Get pharmacy-related tasks
      const response = await fetch(`/api/now/table/${this.dischargeTaskTable}?sysparm_query=short_descriptionLIKEpharmacy^ORshort_descriptionLIKEmedication^ORshort_descriptionLIKEreconciliation&sysparm_display_value=all&sysparm_limit=50&sysparm_fields=sys_id,short_description,state,priority,due_date,assigned_to,u_discharge_case,sys_updated_on`, {
        headers: { "Accept": "application/json", "X-UserToken": window.g_ck }
      });

      const { result: tasks } = await response.json();
      
      // Get related case information for each task
      const enhancedTasks = await Promise.all(
        (tasks || []).map(async (task) => {
          const caseId = typeof task.u_discharge_case === 'object' ? task.u_discharge_case.value : task.u_discharge_case;
          if (caseId) {
            try {
              const caseResponse = await fetch(`/api/now/table/${this.dischargeCaseTable}/${caseId}?sysparm_display_value=all&sysparm_fields=u_patient_name,u_hospital_number,u_ward`, {
                headers: { "Accept": "application/json", "X-UserToken": window.g_ck }
              });
              
              if (caseResponse.ok) {
                const { result: caseData } = await caseResponse.json();
                return {
                  ...task,
                  patient_name: caseData.u_patient_name,
                  hospital_number: caseData.u_hospital_number,
                  ward: caseData.u_ward
                };
              }
            } catch (err) {
              console.warn('Failed to fetch case data for task:', err);
            }
          }
          return task;
        })
      );

      // Calculate pharmacy-specific stats
      const stats = this.calculatePharmacyStats(enhancedTasks);
      
      return {
        tasks: enhancedTasks,
        stats
      };
    } catch (error) {
      console.error('Error fetching pharmacy tasks:', error);
      throw error;
    }
  }

  calculatePharmacyStats(tasks) {
    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date();
    
    return {
      openTasks: tasks.filter(task => {
        const state = typeof task.state === 'object' ? task.state.value : task.state;
        return state === '1' || state === '2'; // New or In Progress
      }).length,
      
      dueToday: tasks.filter(task => {
        const dueDate = typeof task.due_date === 'object' ? task.due_date.value : task.due_date;
        if (!dueDate) return false;
        return dueDate.split('T')[0] === today;
      }).length,
      
      overdue: tasks.filter(task => {
        const dueDate = typeof task.due_date === 'object' ? task.due_date.value : task.due_date;
        if (!dueDate) return false;
        const due = new Date(dueDate);
        return due < todayDate;
      }).length
    };
  }

  // Doctor-specific methods
  async getDoctorSignoffQueue() {
    try {
      // Get summaries ready for review
      const summariesResponse = await fetch(`/api/now/table/${this.dischargeSummaryTable}?sysparm_query=u_summary_status=ready_for_review^ORu_clinician_approved=false&sysparm_display_value=all&sysparm_limit=50`, {
        headers: { "Accept": "application/json", "X-UserToken": window.g_ck }
      });

      const { result: summaries } = await summariesResponse.json();
      
      // Get related cases
      const caseIds = [...new Set(summaries.map(summary => 
        typeof summary.u_discharge_case === 'object' ? summary.u_discharge_case.value : summary.u_discharge_case
      ).filter(Boolean))];

      let cases = [];
      if (caseIds.length > 0) {
        const casesResponse = await fetch(`/api/now/table/${this.dischargeCaseTable}?sysparm_query=sys_idIN${caseIds.join(',')}^ORu_due_date=NULL&sysparm_display_value=all`, {
          headers: { "Accept": "application/json", "X-UserToken": window.g_ck }
        });
        const casesData = await casesResponse.json();
        cases = casesData.result || [];
      }

      // Calculate doctor-specific stats
      const stats = await this.calculateDoctorStats(cases, summaries);

      return { 
        cases, 
        summaries: summaries || [],
        stats
      };
    } catch (error) {
      console.error('Error fetching doctor signoff queue:', error);
      throw error;
    }
  }

  async calculateDoctorStats(cases, summaries) {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      awaitingApproval: summaries.filter(summary => {
        const status = typeof summary.u_summary_status === 'object' ? summary.u_summary_status.value : summary.u_summary_status;
        return status === 'ready_for_review';
      }).length,
      
      followupsNotScheduled: cases.filter(caseItem => {
        const dueDate = typeof caseItem.u_due_date === 'object' ? caseItem.u_due_date.value : caseItem.u_due_date;
        return !dueDate;
      }).length,
      
      dueToday: cases.filter(caseItem => {
        const dueDate = typeof caseItem.u_due_date === 'object' ? caseItem.u_due_date.value : caseItem.u_due_date;
        if (!dueDate) return false;
        return dueDate.split('T')[0] === today;
      }).length
    };
  }

  // Existing methods continue...
  // ═══════════════════════════════════════════════════════════════════════
  // USER-TO-ROLE MAPPING
  // Maps ServiceNow user_ids to their CareFlow provider role.
  // Used by getMyTasks() to filter tasks assigned to the logged-in user.
  // ═══════════════════════════════════════════════════════════════════════
  static USER_ROLE_MAP = {
    'careflow_doctor':   'doctor',
    'careflow_nurse':    'nurse',
    'careflow_pharmacy': 'pharmacy',
    'careflow_admin':    'admin'
  };

  /**
   * Get discharge tasks assigned to the current user (by user_id).
   * Falls back to querying by assigned_to if user_id isn't in the role map.
   */
  async getMyTasks() {
    try {
      const currentUser = window.NOW?.user?.userID || '';
      const currentUserName = window.NOW?.user?.userName || '';

      // Try to determine user's provider role from the user map
      const providerRole = DischargeCaseService.USER_ROLE_MAP[currentUserName] || null;

      // Build query: if we know the role, filter by u_provider_role; always filter by assigned_to
      let query = '';
      if (providerRole && providerRole !== 'admin') {
        // Role-specific users get tasks filtered by their provider role
        query = `u_provider_role=${providerRole}`;
      } else if (currentUser) {
        // Fallback: filter by assigned_to (admin sees tasks assigned to them)
        query = `assigned_to=${currentUser}`;
      }

      const response = await fetch(
        `/api/now/table/${this.dischargeTaskTable}?sysparm_query=${query}&sysparm_display_value=all&sysparm_limit=50&sysparm_fields=sys_id,short_description,state,priority,due_date,assigned_to,u_discharge_case,u_provider_role,sys_updated_on`,
        { headers: { "Accept": "application/json", "X-UserToken": window.g_ck } }
      );

      const { result: tasks } = await response.json();
      
      const caseIds = [...new Set((tasks || []).map(task => 
        typeof task.u_discharge_case === 'object' ? task.u_discharge_case.value : task.u_discharge_case
      ).filter(Boolean))];

      let cases = [];
      if (caseIds.length > 0) {
        const casesResponse = await fetch(
          `/api/now/table/${this.dischargeCaseTable}?sysparm_query=sys_idIN${caseIds.join(',')}&sysparm_display_value=all&sysparm_fields=sys_id,u_patient_name,u_hospital_number,u_ward,u_discharging_status`,
          { headers: { "Accept": "application/json", "X-UserToken": window.g_ck } }
        );
        const casesData = await casesResponse.json();
        cases = casesData.result || [];
      }

      // Enrich tasks with case info for display
      const enrichedTasks = (tasks || []).map(task => {
        const caseId = typeof task.u_discharge_case === 'object' ? task.u_discharge_case.value : task.u_discharge_case;
        const relatedCase = cases.find(c => {
          const id = typeof c.sys_id === 'object' ? c.sys_id.value : c.sys_id;
          return id === caseId;
        });
        return {
          ...task,
          patient_name: relatedCase?.u_patient_name,
          hospital_number: relatedCase?.u_hospital_number,
          ward: relatedCase?.u_ward
        };
      });

      return { cases, tasks: enrichedTasks };
    } catch (error) {
      console.error('Error fetching my tasks:', error);
      return { cases: [], tasks: [] };
    }
  }

  async getNursingQueue() {
    try {
      const response = await fetch(`/api/now/table/${this.dischargeCaseTable}?sysparm_query=u_discharging_status=draft^ORu_discharging_status=ready_for_discharge&sysparm_display_value=all&sysparm_limit=50`, {
        headers: { "Accept": "application/json", "X-UserToken": window.g_ck }
      });

      const { result: cases } = await response.json();
      return { cases: cases || [] };
    } catch (error) {
      console.error('Error fetching nursing queue:', error);
      return { cases: [] };
    }
  }

  async getPharmacyQueue() {
    try {
      const response = await fetch(`/api/now/table/${this.dischargeCaseTable}?sysparm_query=u_discharging_status!=discharged&sysparm_display_value=all&sysparm_limit=50`, {
        headers: { "Accept": "application/json", "X-UserToken": window.g_ck }
      });

      const { result: cases } = await response.json();
      return { cases: cases || [] };
    } catch (error) {
      console.error('Error fetching pharmacy queue:', error);
      return { cases: [] };
    }
  }

  async getFollowupsDue() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekFromToday = new Date();
      weekFromToday.setDate(weekFromToday.getDate() + 7);
      
      const response = await fetch(`/api/now/table/${this.dischargeCaseTable}?sysparm_query=u_due_dateBETWEEN${today}@${weekFromToday.toISOString().split('T')[0]}&sysparm_display_value=all&sysparm_limit=50`, {
        headers: { "Accept": "application/json", "X-UserToken": window.g_ck }
      });

      const { result: cases } = await response.json();
      return { cases: cases || [] };
    } catch (error) {
      console.error('Error fetching follow-ups due:', error);
      return { cases: [] };
    }
  }

  async getFailedCommunications() {
    try {
      const commResponse = await fetch(`/api/now/table/${this.commLogTable}?sysparm_query=u_delivery_status=failed&sysparm_display_value=all&sysparm_limit=50`, {
        headers: { "Accept": "application/json", "X-UserToken": window.g_ck }
      });

      const { result: communications } = await commResponse.json();
      
      const caseIds = [...new Set(communications.map(comm => 
        typeof comm.u_discharge_case === 'object' ? comm.u_discharge_case.value : comm.u_discharge_case
      ).filter(Boolean))];

      let cases = [];
      if (caseIds.length > 0) {
        const casesResponse = await fetch(`/api/now/table/${this.dischargeCaseTable}?sysparm_query=sys_idIN${caseIds.join(',')}&sysparm_display_value=all`, {
          headers: { "Accept": "application/json", "X-UserToken": window.g_ck }
        });
        const casesData = await casesResponse.json();
        cases = casesData.result || [];
      }

      return { cases, communications: communications || [] };
    } catch (error) {
      console.error('Error fetching failed communications:', error);
      return { cases: [], communications: [] };
    }
  }

  async getDashboardStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const dischargesTodayResponse = await fetch(`/api/now/table/${this.dischargeCaseTable}?sysparm_query=u_discharge_dateON${today}&sysparm_count=true`, {
        headers: { "Accept": "application/json", "X-UserToken": window.g_ck }
      });
      
      const pendingSummariesResponse = await fetch(`/api/now/table/${this.dischargeSummaryTable}?sysparm_query=u_summary_status=draft^ORu_summary_status=ready_for_review&sysparm_count=true`, {
        headers: { "Accept": "application/json", "X-UserToken": window.g_ck }
      });

      const awaitingApprovalResponse = await fetch(`/api/now/table/${this.dischargeSummaryTable}?sysparm_query=u_summary_status=ready_for_review&sysparm_count=true`, {
        headers: { "Accept": "application/json", "X-UserToken": window.g_ck }
      });

      const failedCommsResponse = await fetch(`/api/now/table/${this.commLogTable}?sysparm_query=u_delivery_status=failed&sysparm_count=true`, {
        headers: { "Accept": "application/json", "X-UserToken": window.g_ck }
      });

      const weekFromToday = new Date();
      weekFromToday.setDate(weekFromToday.getDate() + 7);
      const followupsDueResponse = await fetch(`/api/now/table/${this.dischargeCaseTable}?sysparm_query=u_due_dateBETWEEN${today}@${weekFromToday.toISOString().split('T')[0]}&sysparm_count=true`, {
        headers: { "Accept": "application/json", "X-UserToken": window.g_ck }
      });

      return {
        dischargesToday: parseInt((await dischargesTodayResponse.json())?.result?.stats?.count || 0),
        pendingSummaries: parseInt((await pendingSummariesResponse.json())?.result?.stats?.count || 0),
        awaitingApproval: parseInt((await awaitingApprovalResponse.json())?.result?.stats?.count || 0),
        pharmacyActions: 0, // Placeholder - would need pharmacy-specific table
        followupsDue: parseInt((await followupsDueResponse.json())?.result?.stats?.count || 0),
        failedComms: parseInt((await failedCommsResponse.json())?.result?.stats?.count || 0)
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        dischargesToday: 0,
        pendingSummaries: 0,
        awaitingApproval: 0,
        pharmacyActions: 0,
        followupsDue: 0,
        failedComms: 0
      };
    }
  }

  async getCase(sysId) {
    try {
      const response = await fetch(`/api/now/table/${this.dischargeCaseTable}/${sysId}?sysparm_display_value=all`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-UserToken": window.g_ck
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch case: ${response.statusText}`);
      }

      const { result } = await response.json();
      
      const summaryResponse = await fetch(`/api/now/table/${this.dischargeSummaryTable}?sysparm_query=u_discharge_case=${sysId}&sysparm_display_value=all&sysparm_limit=1`, {
        headers: { "Accept": "application/json", "X-UserToken": window.g_ck }
      });
      
      const summaryData = await summaryResponse.json();
      const summary = summaryData.result?.[0] || null;

      const tasksResponse = await fetch(`/api/now/table/${this.dischargeTaskTable}?sysparm_query=u_discharge_case=${sysId}&sysparm_display_value=all`, {
        headers: { "Accept": "application/json", "X-UserToken": window.g_ck }
      });
      
      const tasksData = await tasksResponse.json();
      const tasks = tasksData.result || [];

      const commLogResponse = await fetch(`/api/now/table/${this.commLogTable}?sysparm_query=u_discharge_case=${sysId}&sysparm_display_value=all&sysparm_order_by=sys_created_on`, {
        headers: { "Accept": "application/json", "X-UserToken": window.g_ck }
      });
      
      const commLogData = await commLogResponse.json();
      const communicationLog = commLogData.result || [];

      return {
        case: result,
        summary,
        tasks,
        communicationLog
      };
    } catch (error) {
      console.error('Error fetching case:', error);
      throw error;
    }
  }

  // All existing action methods continue...
  async updateCase(sysId, data) {
    try {
      const response = await fetch(`/api/now/table/${this.dischargeCaseTable}/${sysId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-UserToken": window.g_ck
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update case: ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error updating case:', error);
      throw error;
    }
  }

  async updateSummary(sysId, data) {
    try {
      const response = await fetch(`/api/now/table/${this.dischargeSummaryTable}/${sysId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-UserToken": window.g_ck
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update summary: ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error updating summary:', error);
      throw error;
    }
  }

  async createCommunicationEntry(caseId, type, status, channel, address, error = null) {
    try {
      const data = {
        u_discharge_case: caseId,
        u_recipient_type: type,
        u_delivery_status: status,
        u_delivery_channel: channel,
        u_recipient_address: address,
        u_sent_on: new Date().toISOString()
      };

      if (error) {
        data.u_error_mesage = error;
      }

      const response = await fetch(`/api/now/table/${this.commLogTable}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-UserToken": window.g_ck
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create communication entry: ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error creating communication entry:', error);
      throw error;
    }
  }

  // Role-based action methods
  async markReadyForDischarge(caseId) {
    const result = await this.updateCase(caseId, { u_discharging_status: 'ready_for_discharge' });
    await this.createCommunicationEntry(caseId, 'system', 'sent', 'audit', 'system', null);
    return result;
  }

  /**
   * @deprecated Use completeTasksForRole() instead.
   * This old method set u_tasks_complete = true on the case directly,
   * allowing a nurse to complete ALL roles' tasks. Kept for backward
   * compatibility but should not be called from new code.
   */
  async completeDischargeTasks(caseId) {
    console.warn('DischargeCaseService.completeDischargeTasks() is DEPRECATED. Use completeTasksForRole() instead.');
    const result = await this.updateCase(caseId, { u_tasks_complete: true });
    await this.createCommunicationEntry(caseId, 'system', 'sent', 'audit', 'Discharge tasks completed', null);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════
  // ROLE-SCOPED TASK COMPLETION (replaces completeDischargeTasks)
  //
  // Each method calls the server-side DischargeTaskService via the
  // Scripted REST API. The server enforces RBAC — if the logged-in
  // user doesn't hold the matching role, the request returns 403.
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Complete discharge tasks for a specific provider role.
   * Server-side enforced: user must have the matching role or discharge_admin.
   *
   * @param {string} caseId   - sys_id of the discharge case
   * @param {string} roleName - 'doctor' | 'nurse' | 'pharmacy'
   * @returns {object} { status, message, data: { updated_count, skipped_count, errors[] } }
   */
  async completeTasksForRole(caseId, roleName) {
    try {
      const response = await fetch(
        `/api/728557/careflow_ai_patient_discharge_case_api/discharge_case/${caseId}/complete_tasks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserToken': window.g_ck
          },
          body: JSON.stringify({ role_name: roleName })
        }
      );

      const json = await response.json();

      if (!response.ok) {
        const errorMsg = json?.result?.message || response.statusText;
        throw new Error(errorMsg);
      }

      return {
        success: true,
        message: json.result.message,
        data: json.result.data
      };
    } catch (error) {
      console.error(`Error completing ${roleName} tasks:`, error);
      throw error;
    }
  }

  /** Convenience: complete only nurse tasks */
  async completeNurseTasks(caseId) {
    return this.completeTasksForRole(caseId, 'nurse');
  }

  /** Convenience: complete only doctor tasks */
  async completeDoctorTasks(caseId) {
    return this.completeTasksForRole(caseId, 'doctor');
  }

  /** Convenience: complete only pharmacy tasks */
  async completePharmacyTasks(caseId) {
    return this.completeTasksForRole(caseId, 'pharmacy');
  }

  /**
   * Get task completion summary broken down by role.
   * Returns { doctor: {total, open, complete}, nurse: {...}, pharmacy: {...} }
   */
  async getTaskSummaryByRole(caseId) {
    try {
      const response = await fetch(
        `/api/728557/careflow_ai_patient_discharge_case_api/discharge_case/${caseId}/task_summary`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-UserToken': window.g_ck
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch task summary: ${response.statusText}`);
      }

      const json = await response.json();
      return json.result.data;
    } catch (error) {
      console.error('Error fetching task summary by role:', error);
      throw error;
    }
  }

  async requestSummaryReview(summaryId) {
    const result = await this.updateSummary(summaryId, { u_summary_status: 'ready_for_review' });
    return result;
  }

  async approveSummary(summaryId) {
    const result = await this.updateSummary(summaryId, { 
      u_summary_status: 'clinician_approved',
      u_clinician_approved: true,
      u_approved_on: new Date().toISOString(),
      u_approved_by: window.NOW?.user?.userID || 'current_user'
    });
    return result;
  }

  async rejectSummary(summaryId, comment) {
    const result = await this.updateSummary(summaryId, { 
      u_summary_status: 'draft'
    });
    return result;
  }

  // Pharmacy role actions
  async markMedsReviewed(caseId) {
    await this.createCommunicationEntry(caseId, 'system', 'sent', 'audit', 'Medications reviewed by pharmacy', null);
    return { success: true, message: 'Medications marked as reviewed' };
  }

  async markMedsDispensed(caseId) {
    await this.createCommunicationEntry(caseId, 'system', 'sent', 'audit', 'Medications dispensed', null);
    return { success: true, message: 'Medications marked as dispensed' };
  }

  async requestMedClarification(caseId, notes) {
    await this.createCommunicationEntry(caseId, 'system', 'sent', 'audit', `Clarification requested: ${notes}`, null);
    return { success: true, message: 'Clarification request sent' };
  }

  // Coordinator/Admin role actions
  async sendSummaryToGP(caseId, summaryId, gpEmail) {
    try {
      if (summaryId) {
        await this.updateSummary(summaryId, { 
          u_gp_delivery_status: 'sent',
          u_sent_to_gp_on: new Date().toISOString()
        });
      }
      
      await this.createCommunicationEntry(caseId, 'gp', 'sent', 'email', gpEmail, null);
      
      return { success: true, message: 'Discharge summary sent to GP' };
    } catch (error) {
      await this.createCommunicationEntry(caseId, 'gp', 'failed', 'email', gpEmail, error.message);
      throw error;
    }
  }

  async notifyPatient(caseId, summaryId, patientEmail) {
    try {
      if (summaryId) {
        await this.updateSummary(summaryId, { 
          u_patient_delivery_status: 'sent',
          u_sent_to_patient_on: new Date().toISOString()
        });
      }
      
      await this.createCommunicationEntry(caseId, 'patient', 'sent', 'email', patientEmail, null);
      
      return { success: true, message: 'Patient notified successfully' };
    } catch (error) {
      await this.createCommunicationEntry(caseId, 'patient', 'failed', 'email', patientEmail, error.message);
      throw error;
    }
  }

  async scheduleFollowUp(caseId, followUpDate, notes) {
    const result = await this.updateCase(caseId, { 
      u_due_date: followUpDate
    });
    
    await this.createCommunicationEntry(caseId, 'system', 'sent', 'audit', `Follow-up scheduled: ${notes}`, null);
    return result;
  }

  async sendFollowUpReminder(caseId, recipientType, recipientAddress) {
    await this.createCommunicationEntry(caseId, recipientType, 'sent', 'email', recipientAddress, null);
    return { success: true, message: 'Follow-up reminder sent' };
  }

  async retryFailedSend(caseId, recipientType, recipientAddress, channel = 'email') {
    try {
      await this.createCommunicationEntry(caseId, recipientType, 'sent', channel, recipientAddress, null);
      return { success: true, message: 'Communication retry successful' };
    } catch (error) {
      await this.createCommunicationEntry(caseId, recipientType, 'failed', channel, recipientAddress, error.message);
      throw error;
    }
  }
}