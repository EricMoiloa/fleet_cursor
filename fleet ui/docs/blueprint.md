# **App Name**: FleetWise

## Core Features:

- Authentication & Authorization: Secure login using email/password with Sanctum token and role-based access control (Super Admin, Ministry Admin, Fleet Manager, Driver, Worker). Forced password change on first login.
- User Management: Super Admin creates Ministries and Ministry Admins. Ministry Admin creates Departments and registers Fleet Managers, Drivers, Workers. Each role has appropriate permissions.
- Vehicle Request Workflow: Workers submit vehicle requests with origin, destination, date/time, and purpose. Fleet Managers approve, queue, or deny requests, assigning vehicles and drivers.
- Trip Management: Drivers start trips (odometer out) and end trips (odometer in, notes). Record fuel logs (optional).
- Role-Based Dashboards: Custom dashboards for each role with relevant KPIs, key tasks, and pages (Ministries, Departments, Vehicles, Users, Requests, Trips).
- Real-time status updates: The LLM will decide the fastest tool (email, sms, or push notification) to incorporate, as a tool, for notification based on current configurations.
- Reporting: Admins generate custom fleet reports

## Style Guidelines:

- Primary color: Deep blue (#1E3A8A) to convey trust and authority.
- Background color: Light gray (#F0F4F8) for a clean and modern look.
- Accent color: Forest green (#17b978) to highlight important actions and indicate availability or success.
- Body and headline font: 'Inter' (sans-serif) for a clean and professional feel.
- Use consistent and clear icons from a library like FontAwesome to represent actions, status, and navigation items.
- Implement a responsive layout using Tailwind CSS grid and flexbox to ensure a consistent experience across devices.
- Use subtle animations for transitions and feedback to enhance the user experience, such as loading states, confirmations, and changes in status.