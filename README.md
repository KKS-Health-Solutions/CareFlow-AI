# CareFlow: Patient Discharge & Follow-Up Management System

## Overview

CareFlow is a comprehensive patient discharge management system built on the ServiceNow platform. It streamlines the complex discharge process by coordinating tasks across multiple healthcare roles - doctors, nurses, pharmacy, and administrators. The system automates discharge summary generation, tracks medication reconciliation, manages follow-up scheduling, and ensures proper communication with patients and general practitioners.

The platform solves the common healthcare challenge of fragmented discharge processes where critical steps can be missed, leading to readmissions and poor patient outcomes.

## Tech Stack

**Platform:** ServiceNow (Zurich)  
**Frontend:** Now Experience UI Framework with React components  
**Backend:** ServiceNow Glide APIs and server-side JavaScript  
**Automation:** Flow Designer workflows  
**Business Logic:** Business Rules and Script Includes  
**Data Layer:** ServiceNow tables with custom schemas  
**APIs:** Scripted REST APIs for external integrations  
**Security:** ServiceNow ACLs and role-based access control  

## Architecture / Design

The system follows a role-based architecture with separate workflows for each healthcare role:

**Data Layer:**
- `u_cflow_patient_discharge_case` - Main case records
- `u_discharge_summary` - Clinical summaries and approvals
- `u_discharge_task` - Role-specific tasks and assignments  
- `u_discharge_communication_log` - Audit trail for all communications

**Presentation Layer:**
- Role-specific dashboards (Doctor, Nurse, Pharmacy, Admin)
- Case workspace for detailed record management
- KPI tiles and real-time status tracking

**Process Layer:**
- Flow Designer workflows for automation
- Business Rules for data validation and triggers
- Scripted REST APIs for external system integration

Data flows from case creation through role-specific task completion, with each stage triggering appropriate notifications and status updates.

## Key Features

- **Role-Based Dashboards:** Customized views showing only relevant cases and tasks
- **Automated Summary Generation:** Clinical summaries created from structured case data
- **Task Management:** Role-specific checklists with progress tracking
- **Communication Tracking:** Complete audit trail for GP and patient notifications
- **Exception Handling:** Alerts for failed communications and overdue tasks
- **Follow-Up Scheduling:** Automated reminders and appointment coordination
- **Status Validation:** Prevents workflow progression without required approvals

## Business Rules & Logic

**Before Insert/Update Rules:**
- Status validation ensuring proper workflow progression
- Required field validation based on discharge stage
- Automatic task creation when cases reach "ready for discharge" status

**After Update Rules:**
- Clinical summary generation triggered by status changes
- Communication log entries for audit compliance
- Task assignment based on ward and case complexity

**Key Logic Examples:**
```javascript
// Auto-generate formatted clinical summary
if (current.u_discharging_status == 'discharged') {
    var clinicalSummary = 'DISCHARGE SUMMARY\n\n';
    clinicalSummary += 'PATIENT: ' + current.getValue('u_patient_name');
    // ... template continues
}
```

## Workflows / Flow Designer

**Primary Flows:**
1. **Auto Generate Discharge Summary:** Triggered on case updates, combines clinical data into structured summaries
2. **Task Assignment Flow:** Creates role-specific tasks when discharge criteria are met  
3. **Communication Automation:** Handles GP notifications and patient follow-up reminders

**Triggers:**
- Record updates on discharge cases
- Status changes requiring approval
- Overdue task notifications
- Failed communication retries

**Actions:**
- Email notifications to stakeholders
- Task creation and assignment
- Status field updates
- Integration with external systems

## Example Flow

Here's how a typical discharge process works:

1. **Case Creation:** Nurse creates discharge case with patient demographics and initial assessment
2. **Task Generation:** System automatically creates role-specific tasks (medical review, pharmacy reconciliation, discharge planning)
3. **Doctor Review:** Doctor completes clinical summary, sets diagnosis and follow-up instructions
4. **Summary Generation:** Business Rule triggers formatted clinical summary creation
5. **Pharmacy Reconciliation:** Pharmacy reviews medications, marks as dispensed
6. **Approval Process:** Doctor approves final summary, case status moves to "ready for discharge"
7. **Communications:** Admin sends summary to GP, notifies patient of discharge
8. **Follow-Up Scheduling:** System tracks follow-up appointments and sends reminders
9. **Audit Trail:** All actions logged in communication table for compliance

## Design Decisions

**Business Rules vs Flow Designer:**
- Business Rules handle immediate data validation and formatting (clinical summaries)
- Flow Designer manages complex multi-step processes (communication workflows)
- This separation ensures data integrity while maintaining process flexibility

**Role-Based UI Architecture:**
- Separate dashboards prevent information overload
- Each role sees only actionable items relevant to their workflow
- Reduces clicks and improves efficiency in clinical settings

**Communication Logging:**
- Every system action creates an audit entry
- Critical for healthcare compliance and debugging failed processes
- Enables retry mechanisms for failed communications

**ServiceNow Platform Choice:**
- Built-in approval workflows reduce custom development
- Native reporting and dashboard capabilities
- Enterprise-grade security and compliance features
- Integration capabilities with hospital systems (HL7, FHIR)

The system prioritizes clinical workflow efficiency while maintaining comprehensive audit trails required in healthcare environments.

## Getting Started

### Prerequisites
- ServiceNow instance (Vancouver or later)
- System Administrator access
- Now Experience UI Framework enabled

### Installation
1. Import the application files to your ServiceNow instance
2. Configure user roles (Doctor, Nurse, Pharmacy, Admin)
3. Set up Flow Designer workflows
4. Configure Business Rules and ACLs
5. Deploy UI Pages and components

### Usage
Access the system through the main dashboard:
- **Dashboard URL:** `/discharge_command_center.do`
- **Case Workspace:** `/patient_discharge_case.do`

Select your role from the landing page to access role-specific functionality.
