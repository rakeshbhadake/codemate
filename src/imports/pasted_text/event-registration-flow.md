Modify ONLY the existing "Create Event / Hackathon" flow shown in the attached Figma design. Do NOT redesign the UI, change colors, typography, spacing, component styling, or layout. Extend the existing design by adding the following functionality while maintaining the current design language.

# Create Event / Hackathon Enhancements

## 1. Problem Statement

Add a new required section below the Description field.

Field Name:
Problem Statement *

Type:
Multi-line Text Area

Placeholder:
"Describe the problem statement, challenge, objectives, expected solution, evaluation criteria, datasets/resources (if any), and any important rules."

Features:
- Rich text support (optional)
- Character counter
- Minimum character validation
- Expandable textarea

--------------------------------------------

## 2. Team Size Configuration

Allow the event organizer to define team size.

Add two required numeric fields:

Minimum Team Members *
Maximum Team Members *

Rules:
- Minimum value = 1
- Maximum value = 20
- Maximum must always be greater than or equal to Minimum
- Show validation messages for invalid values

Example:
Minimum Team Members: 2
Maximum Team Members: 5

These values will control the registration form dynamically.

--------------------------------------------

## 3. Event Registration

Every published event should display a prominent "Register" button/icon.

Only authenticated users can register.

Clicking Register opens a dedicated Event Registration modal/page.

--------------------------------------------

## 4. Team Registration Form

The registration form should contain:

### Team Information

- Team Name *
- Team Leader

Automatically populate:
- Logged-in user's name
- Email

--------------------------------------------

## 5. Team Members

Generate member input sections dynamically based on the organizer's Minimum Team Members value.

For each member collect:

- Full Name *
- Email *
- Phone Number *
- Country Code Dropdown

Example:

Member 1
Name
Email
Country Code
Phone Number

Member 2
Name
Email
Country Code
Phone Number

...

If the minimum team size is 3, display exactly 3 member sections by default.

--------------------------------------------

## 6. Add Member

Provide an "Add Member" (+) button.

Each click creates another member section.

The user can continue adding members until reaching the organizer-defined Maximum Team Members.

--------------------------------------------

## 7. Maximum Member Validation

Once the maximum team size is reached:

- Disable the Add Member button.
- Show tooltip/message:

"Maximum team size reached."

If the user still attempts to add members, display:

"You have reached the maximum number of team members allowed for this event."

--------------------------------------------

## 8. Remove Member

Allow removal of only optional members.

The minimum required members cannot be removed.

--------------------------------------------

## 9. Registration Validation

Validate:

- Required fields
- Valid email
- Valid phone number
- Duplicate email prevention
- Duplicate phone prevention
- Team size within allowed range

Registration should only be submitted after all validations pass.

--------------------------------------------

## 10. Organizer Dashboard

The event organizer should have access to an Event Registrations dashboard.

For every event display:

- Total registrations
- Total teams
- Remaining registration slots (if applicable)
- Registration status (Open/Closed)

--------------------------------------------

## 11. Team Details View

The organizer can view every registered team.

Display:

Team Name

Team Leader

Registration Time

Number of Members

Member List:

- Name
- Email
- Country Code
- Phone Number

--------------------------------------------

## 12. Registration Management

Allow organizers to:

- Search teams
- Filter registrations
- Sort by registration time
- Export registrations (CSV/Excel)
- Approve/Reject registrations (optional)
- View complete team profile

--------------------------------------------

## 13. Event Card Enhancements

Each published event card should display:

- Event Poster
- Event Title
- Organizer
- Date & Time
- Location
- Event Location Link
- Event Link
- Problem Statement Preview
- Required Skills
- Team Size (Min–Max)
- Number of Registered Teams
- Registration Deadline (optional)
- Register Button

--------------------------------------------

## 14. Additional Recommended Features

Add support for the following features while keeping the existing UI consistent:

### Registration Deadline
Allow organizers to specify a registration closing date and time.

### Maximum Team Registrations
Limit the total number of teams allowed to register.

### Event Banner Upload
Allow organizers to upload a dedicated event poster/banner.

### Prize Pool
Optional field for prize amount or rewards.

### Eligibility
Specify eligibility such as:
- College students
- Freshers
- Professionals
- Open to everyone

### Mode
- Online
- Offline
- Hybrid

### Event Category
Examples:
- Hackathon
- Coding Contest
- Workshop
- Webinar
- Meetup
- Startup Pitch

### Technologies
Allow organizers to add technology tags such as:
AI, ML, Web Development, Java, React, Flutter, Cybersecurity, Cloud, etc.

### Registration Status
Show badges:
- Open
- Closing Soon
- Closed

### Save Event
Allow users to bookmark/save events.

### Share Event
Allow sharing via link or social platforms.

### Calendar Integration
Add event to Google Calendar/Outlook.

### Reminder Notifications
Notify registered users:
- 24 hours before
- 1 hour before
- Event started

### Organizer Contact
Display organizer details for participant queries.

### FAQ Section
Optional Frequently Asked Questions.

### Attachments
Allow organizers to upload:
- Rulebook
- Problem Statement PDF
- Resources
- Dataset links

### Live Registration Counter
Display:
"127 Teams Registered"

updated in real time.

### Participant Confirmation
After successful registration show:

"Your team has been registered successfully."

Send confirmation through:
- In-app notification
- Email

--------------------------------------------

## General Requirements

- Do NOT redesign the current UI.
- Preserve the existing layout and design system.
- Ensure all new fields follow the current styling.
- Maintain full responsiveness.
- Reuse existing components wherever possible.
- All validations should provide clear, user-friendly error messages.
- Keep the registration flow simple, modern, and intuitive while supporting dynamic team-size configuration.