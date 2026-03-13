/**
 * =============================================================================
 * Scripted REST API Resource: Get Discharge Summary
 * =============================================================================
 *
 * WHERE TO PLACE IN SERVICENOW:
 *   Add as a NEW RESOURCE under the existing Scripted REST API:
 *     "Patient Discharge Case API" (api_id: 728557)
 *
 *   Resource Name:     Get Discharge Summary
 *   HTTP Method:       GET
 *   Relative Path:     /discharge_case/{case_sys_id}/summary
 *   Requires Auth:     true
 *
 * BASE URL:
 *   GET https://dev277501.service-now.com/api/728557/careflow_ai_patient_discharge_case_api/discharge_case/{case_sys_id}/summary
 * =============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE: GET /discharge_case/{case_sys_id}/summary
// ─────────────────────────────────────────────────────────────────────────────
// Copy the script below into the Scripted REST Resource "Script" field.

(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

    var caseSysId = request.pathParams.case_sys_id;

    if (!caseSysId) {
        response.setStatus(400);
        response.setBody({
            result: {
                status: 'error',
                message: 'case_sys_id path parameter is required'
            }
        });
        return;
    }

    var gr = new GlideRecord('u_discharge_summary');
    gr.addQuery('u_discharge_case', caseSysId);
    gr.orderByDesc('sys_created_on');
    gr.setLimit(1);
    gr.query();

    if (!gr.next()) {
        response.setStatus(404);
        response.setBody({
            result: {
                status: 'not_found',
                message: 'No discharge summary found for this case'
            }
        });
        return;
    }

    response.setStatus(200);
    response.setBody({
        result: {
            status: 'success',
            data: {
                sys_id: gr.getUniqueValue(),
                u_summary_status: gr.getValue('u_summary_status'),
                u_summary_status_display: gr.getDisplayValue('u_summary_status'),
                u_clinical_summary: gr.getValue('u_clinical_summary'),
                u_diagnosis: gr.getValue('u_diagnosis'),
                u_hospital_course: gr.getValue('u_hospital_course'),
                u_medications_on_discharge: gr.getValue('u_medications_on_discharge'),
                u_follow_up_instructions: gr.getValue('u_follow_up_instructions'),
                u_gp_notes: gr.getValue('u_gp_notes'),
                u_clinician_approved: gr.getValue('u_clinician_approved'),
                u_approved_on: gr.getValue('u_approved_on'),
                sys_created_on: gr.getValue('sys_created_on'),
                sys_updated_on: gr.getValue('sys_updated_on')
            }
        }
    });

})(request, response);

/*
 * ─── Usage Example ───────────────────────────────────────────────────────
 *
 * GET /api/728557/careflow_ai_patient_discharge_case_api/discharge_case/89bd8f3cc3c7b2100fa7bd43e401315f/summary
 *
 * Headers:
 *   Accept: application/json
 *   X-UserToken: <g_ck token>
 *
 * Success Response (200):
 *   {
 *     "result": {
 *       "status": "success",
 *       "data": {
 *         "sys_id": "abc123...",
 *         "u_summary_status": "clinician_approved",
 *         "u_summary_status_display": "Clinician Approved",
 *         "u_clinical_summary": "Patient presented with...",
 *         "u_diagnosis": "Type 2 Diabetes...",
 *         "u_hospital_course": "Patient was admitted for...",
 *         "u_medications_on_discharge": "Metformin 500mg...",
 *         "u_follow_up_instructions": "Follow up with GP in 2 weeks",
 *         "u_gp_notes": "Please monitor HbA1c",
 *         "u_clinician_approved": "true",
 *         "u_approved_on": "2026-03-07 10:00:00",
 *         "sys_created_on": "2026-03-06 09:00:00",
 *         "sys_updated_on": "2026-03-07 10:00:00"
 *       }
 *     }
 *   }
 *
 * Not Found Response (404):
 *   {
 *     "result": {
 *       "status": "not_found",
 *       "message": "No discharge summary found for this case"
 *     }
 *   }
 *
 * Error Response (400):
 *   {
 *     "result": {
 *       "status": "error",
 *       "message": "case_sys_id path parameter is required"
 *     }
 *   }
 */
