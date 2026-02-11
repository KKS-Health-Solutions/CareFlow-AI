# How to Create a Scripted REST API in ServiceNow

> This guide walks through creating a **Scripted REST API** to power the "Create Patient" feature in CareFlow-AI.

---

## Prerequisites

- Admin or `rest_api_explorer` role on your ServiceNow instance
- You have already navigated to **All → Scripted REST APIs** in the ServiceNow platform

---

## Step 1: Create the Scripted REST API (Container)

1. Click the **New** button in the top-left of the Scripted REST APIs list
2. Fill in the following fields:

   | Field | Value |
   |---|---|
   | **Name** | `CareFlow Patient API` |
   | **API ID** | `careflow` (auto-generated from name, but make sure you prefix it with "careflow_ai") |
   | **API Namespace** | Leave as your app scope (e.g. `728557`) |
   | **Protection Policy** | `-- None --` |

3. Click **Submit**

> ✅ This creates the API container. Your base URL will be:
> ```
> /api/728557/careflow_ai_adx
> ```

---

## Step 2: Create a Resource (Endpoint)

After submitting, ServiceNow will redirect you to the API record. Now you need to add a **Resource** (an individual endpoint).

1. Scroll down to the **Resources** related list at the bottom of the form
2. Click **New**
3. Fill in the following fields:

   | Field | Value |
   |---|---|
   | **Name** | `Create Patient Discharge Case` |
   | **HTTP Method** | `POST` |
   | **Relative path** | `/discharge_case` |
   | **Authentication** | Leave default (inherits from parent — session-based) |

4. **Do NOT submit yet** — you need to add the script first (Step 3)

> ✅ Your full endpoint will be:
> ```
> POST /api/728557/careflow_ai_patient_discharge_case_api
> ```

---

## Step 3: Write the Server-Side Script

In the **Script** field of the Resource form, paste the following GlideRecord script:

```javascript
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

    // implement resource here
    try {
        // 1. Parse the incoming JSON body
        var body = request.body.data;

        var patientName = body.patient_name   || '';
        var hospitalNumber = body.hospital_number || '';
        var admissionReason = body.admission_reason || '';
        var ward = body.ward || generall_medicine;
        var riskLevel = body.risk_level || 'moderate';

        // 2. Validate required fields
        if (!patientName || !hospitalNumber) {
            response.setStatus(400);
            return {
                status: 'error',
                message: 'patient_name and hospital number are required fields'
            };
        }

        // 3. Create the discharge case record
        var caseGR = new GlideRecord('u_cflow_patient_discharge_case');
        caseGR.initialize();
        caseGR.setValue('u_patient_name', patientName);
        caseGR.setValue('u_hospital_number', hospitalNumber);
        caseGR.setValue('u_admission_reason', diagnosis);
        caseGR.setValue('u_ward', ward);
        caseGR.setValue('u_risk_level', riskLevel);
        var caseSysId = caseGR.insert();

        if (!caseSysId) {
            response.setStatus(500);
            return {
                status: 'error',
                message: 'Failed to create discharge case record'
            };
        }


        // 5. Return success with the sys_ids
        response.setStatus(201);
        return {
            status: 'success',
            message: 'Patient discharge case created successfully',
            data: {
                case_sys_id: caseSysId.toString(),
            }
        };

    } catch (ex) {
        response.setStatus(500);
        return {
            status: 'error',
            message: 'Unexpected error: ' + ex.getMessage()
        };
    }


})(request, response);
```

5. Click **Submit** to save the resource

---

## Step 4: Test the API with REST API Explorer

1. Navigate to **All → REST API Explorer** in the platform
2. In the top dropdown, select **Namespace**: `728557`
3. Select **API Name**: `CareFlow Patient API`
4. Select **API Version**: `(default)`
5. Select the **POST /patient** resource
6. In the **Request Body** section, paste this test JSON:

   ```json
   {
       "patient_name": "John Doe",
       "hospital_number": "MRN-2026-0001",
       "admission_reason": "Hip Replacement Recovery",
       "ward": "General Surgery",
       "risk_level": "moderate"
   }
   ```

7. Click **Send**
8. You should see a `201` response with the case `sys_id`:

   ```json
   {
       "result": {
           "status": "success",
           "message": "Patient discharge case created successfully",
           "data": {
               "case_sys_id": "abc123def456...",
               "task_count": 5,
               "task_sys_ids": ["..."]
           }
       }
   }
   ```

> ⚠️ **Note:** ServiceNow wraps your return value inside a `result` property automatically.

---

## Step 5: Verify the Records

1. Navigate to the **u_cflow_patient_discharge_case** table:
   - Go to **All** → type `u_cflow_patient_discharge_case.list` in the filter navigator → press Enter
2. Confirm the new patient record exists with status `pending`
3. Similarly, check the **u_discharge_task** table to verify the 5 default tasks were created

---

## API Contract Summary

### Request

```
POST /api/728557/careflow_ai_patient_discharge_case_api
Content-Type: application/json
X-UserToken: <window.g_ck value>
```

**Payload:**

| Field | Type | Required | Description |
|---|---|---|---|
| `patient_name` | string | ✅ | Full patient name |
| `hospital_number` | string | ✅ | Hospital Number |
| `admission_reason` | string | | Primary diagnosis |
| `ward` | string | | Hospital ward/unit |
| `risk_level` | string | | `low`, `moderate`, `high`, `critical` (default: `moderate`) |

### Response (201 Created)

```json
{
    "result": {
        "status": "success",
        "message": "Patient discharge case created successfully",
        "data": {
            "case_sys_id": "sys_id_of_new_case",
            "task_count": 5,
            "task_sys_ids": ["id1", "id2", "id3", "id4", "id5"]
        }
    }
}
```

### Error Responses

| Status | When |
|---|---|
| `400` | Missing required fields (`patient_name` or `mrn`) |
| `500` | GlideRecord insert failure or unexpected error |

---

## How to Call This from the Frontend

In your React app, this API is called using `fetch()` with the same pattern as the rest of `DischargeCaseService.js`:

```javascript
const response = await fetch('/api/728557/careflow_ai_patient_discharge_case_api', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserToken': window.g_ck   // CSRF token from ServiceNow
    },
    body: JSON.stringify({
        patient_name: 'John Doe',
        mrn: 'MRN-2026-0001',
        diagnosis: 'Hip Replacement Recovery',
        attending_physician: 'Dr. Smith',
        ward: 'Orthopedics - 4A',
        priority: 'high'
    })
});

const data = await response.json();
const caseSysId = data.result.data.case_sys_id;

// Navigate to case workspace
window.open(
    '/x_728557_care_flow_ui_patient_discharge_case.do?sys_id=' + caseSysId,
    '_blank'
);
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| **403 Forbidden** | Ensure the user has roles to access the API. Check ACLs on the custom tables. |
| **401 Unauthorized** | Make sure `X-UserToken` header is set to `window.g_ck`. |
| **404 Not Found** | Double-check the API namespace and relative path. The full URL should be `/api/728557/careflow_ai_patient_discharge_case_api`. |
| **Table not found** | Verify the table name `u_cflow_patient_discharge_case` exists on your instance. |
| **Fields not saving** | Column names are case-sensitive. Verify exact field names in the table dictionary. |

---

## Next Steps

Once the API is working:

1. **Wire the frontend** — Add a `createPatient()` method to `DischargeCaseService.js`
2. **Add a Create Patient button** — Modal form on the Dashboard
3. **Navigate on success** — Open the CaseWorkspace with the returned `case_sys_id`
