# CareFlow AI

CareFlow AI is a comprehensive healthcare management application built for ServiceNow that streamlines patient discharge workflows and post-discharge follow-up processes. The application provides role-based dashboards for different healthcare professionals including nurses, doctors, pharmacists, and administrators to efficiently manage patient cases, track discharge readiness, and ensure proper follow-up care.

## Features

- **Role-Based Dashboards**: Customized interfaces for nurses, doctors, pharmacists, and administrators
- **Patient Discharge Management**: Track and manage patient discharge cases with real-time status updates
- **Command Center View**: Centralized dashboard for monitoring all discharge-related activities
- **Case Workspace**: Detailed patient case management interface
- **KPI Tracking**: Monitor key performance indicators for discharge efficiency
- **Alerts & Notifications**: Real-time alerts for overdue cases and follow-up requirements
- **Multi-Role Support**: Switch between different healthcare roles seamlessly

## Setup and Installation

### Prerequisites

- ServiceNow instance with SDK access
- Node.js (version 18 or higher)
- ServiceNow SDK CLI

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd CareFlow-AI
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure ServiceNow connection**
   - Ensure your `now.config.json` is properly configured with your ServiceNow instance details
   - Update the `scopeId` if deploying to a different instance

4. **Build the application**

   ```bash
   npm run build
   ```

5. **Deploy to ServiceNow**

   ```bash
   npm run deploy
   ```

## Development

### Available Scripts

- `npm run build` - Build the application for deployment
- `npm run deploy` - Deploy the application to your ServiceNow instance
- `npm run transform` - Transform the application files
- `npm run types` - Generate TypeScript type definitions

### Project Structure

```md
src/
├── client/                 # Frontend React components and pages
│   ├── components/        # Reusable React components
│   ├── services/         # API service layer
│   ├── dashboard.html    # Main dashboard page
│   └── case-workspace.html # Case workspace page
└── fluent/               # ServiceNow fluent framework files
    ├── ui-pages/        # ServiceNow UI page definitions
    └── generated/       # Auto-generated files
```

## Usage

1. Access the application through your ServiceNow instance
2. Navigate to the "Discharge & Follow-Up Command Center"
3. Select your role (Nurse, Doctor, Pharmacist, or Administrator)
4. Use the dashboard to manage patient discharge cases
5. Monitor KPIs and respond to alerts as needed

## Contributing

This project was developed for the ServiceNow Code to Win Hackathon. For contributions or issues, please contact the development team.

## License

UNLICENSED - This project is proprietary and created for hackathon purposes.
