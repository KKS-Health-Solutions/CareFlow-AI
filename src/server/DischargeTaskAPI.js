/**
 * =============================================================================
 * Scripted REST API Resource: Complete Discharge Tasks for Role
 * =============================================================================
 * 
 * WHERE TO PLACE IN SERVICENOW:
 *   Add as a NEW RESOURCE under the existing Scripted REST API:
 *     "Patient Discharge Case API" (api_id: 728557)
 *   
 *   Resource Name:     Complete Discharge Tasks for Role
 *   HTTP Method:       POST
 *   Relative Path:     /discharge_case/{case_sys_id}/complete_tasks
 *   Requires Auth:     true
 *   
 * ALSO ADD a GET resource for task summary:
 *   Resource Name:     Get Task Summary by Role
 *   HTTP Method:       GET
 *   Relative Path:     /discharge_case/{case_sys_id}/task_summary
 *   Requires Auth:     true
 * 
 * BASE URL:
 *   POST https://dev277501.service-now.com/api/728557/careflow_ai_patient_discharge_case_api/discharge_case/{case_sys_id}/complete_tasks
 *   GET  https://dev277501.service-now.com/api/728557/careflow_ai_patient_discharge_case_api/discharge_case/{case_sys_id}/task_summary
 * =============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE 1: POST /discharge_case/{case_sys_id}/complete_tasks
// ─────────────────────────────────────────────────────────────────────────────
// Copy the script below into the Scripted REST Resource "Script" field.

(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

    var caseSysId = request.pathParams.case_sys_id;
    var body = request.body.data;
    var roleName = body.role_name || '';

    // Input validation
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

    if (!roleName) {
        response.setStatus(400);
        response.setBody({
            result: {
                status: 'error',
                message: 'role_name is required in request body. Valid values: doctor, nurse, pharmacy'
            }
        });
        return;
    }

    // Delegate to the Script Include (server-side RBAC enforced there)
    var service = new DischargeTaskService();
    var result = service.completeTasksForUser(caseSysId, roleName);

    if (result.success) {
        response.setStatus(200);
        response.setBody({
            result: {
                status: 'success',
                message: result.message,
                data: {
                    updated_count: result.updatedCount,
                    skipped_count: result.skippedCount,
                    errors: result.errors
                }
            }
        });
    } else if (result.message.indexOf('Permission denied') > -1) {
        response.setStatus(403);
        response.setBody({
            result: {
                status: 'forbidden',
                message: result.message,
                errors: result.errors
            }
        });
    } else if (result.message.indexOf('not found') > -1) {
        response.setStatus(404);
        response.setBody({
            result: {
                status: 'not_found',
                message: result.message,
                errors: result.errors
            }
        });
    } else {
        response.setStatus(400);
        response.setBody({
            result: {
                status: 'error',
                message: result.message,
                errors: result.errors
            }
        });
    }

})(request, response);

/*
 * ─── Usage Example ───────────────────────────────────────────────────────
 * 
 * POST /api/728557/careflow_ai_patient_discharge_case_api/discharge_case/89bd8f3cc3c7b2100fa7bd43e401315f/complete_tasks
 * 
 * Headers:
 *   Content-Type: application/json
 *   Accept: application/json
 *   X-UserToken: <g_ck token>
 * 
 * Body:
 *   { "role_name": "nurse" }
 * 
 * Success Response (200):
 *   {
 *     "result": {
 *       "status": "success",
 *       "message": "3 nurse task(s) marked complete",
 *       "data": {
 *         "updated_count": 3,
 *         "skipped_count": 0,
 *         "errors": []
 *       }
 *     }
 *   }
 * 
 * Forbidden Response (403):
 *   {
 *     "result": {
 *       "status": "forbidden",
 *       "message": "Permission denied: you do not have the doctor role",
 *       "errors": ["Access denied. User nurse1 does not have role careflow_ai_doctor..."]
 *     }
 *   }
 */


// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE 2: GET /discharge_case/{case_sys_id}/task_summary
// ─────────────────────────────────────────────────────────────────────────────
// Copy the script below into a SEPARATE Scripted REST Resource "Script" field.

/*
(function process(request, response) {

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

    var service = new DischargeTaskService();
    var summary = service.getTaskSummaryByRole(caseSysId);

    response.setStatus(200);
    response.setBody({
        result: {
            status: 'success',
            data: summary
        }
    });

})(request, response);
*/

/*
 * ─── Usage Example ───────────────────────────────────────────────────────
 * 
 * GET /api/728557/careflow_ai_patient_discharge_case_api/discharge_case/89bd8f3cc3c7b2100fa7bd43e401315f/task_summary
 * 
 * Response (200):
 *   {
 *     "result": {
 *       "status": "success",
 *       "data": {
 *         "doctor":   { "total": 3, "open": 1, "complete": 2 },
 *         "nurse":    { "total": 5, "open": 0, "complete": 5 },
 *         "pharmacy": { "total": 2, "open": 2, "complete": 0 }
 *       }
 *     }
 *   }
 */
