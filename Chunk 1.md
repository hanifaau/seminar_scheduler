[CONTEXT: REFER TO CONTEXT7] [UI: UI/UX PRO MAX SKILL] [ENV: MCP SERVER CHECK REQUIRED]

ACT AS: Senior Fullstack Engineer & Database Architect.
CONTEXT: Refer to 'Context7_Specs.md' for architectural standards (Convex & Next.js).

PRE-REQUISITES:
1. Initialize git repository.
2. Setup Next.js (App Router) with Tailwind CSS and Convex.
3. Check MCP Servers: Ensure 'convex' and 'postgres' (if needed) are accessible.

TASK:
Build the Foundation & Data Ingestion Layer for "TI Seminar Scheduler".

SPECIFIC REQUIREMENTS:
1. CONVEX SCHEMA: Define tables:
   - 'lecturers': name, nip, expertise (array), status (active).
   - 'staff': name, nip, role (Admin/Kaprodi).
   - 'teaching_schedules': lecturer_id, day, start_time, end_time, activity.
   - 'expertise_categories': field_name (e.g., Ergonomi, Manufaktur).

2. CSV PARSER COMPONENT (Admin Side):
   - Build a UI using Shadcn/UI for uploading Lecturer Teaching Schedules in CSV format.
   - Logic: Map CSV rows to the 'teaching_schedules' table using lecturer NIP as the key.

3. UI/UX STANDARDS:
   - Implement 'ui-ux-pro-max' design tokens.
   - Create a Responsive Navbar that works for Admin (Desktop) and Lecturers (Mobile).
   - Use 'Atomic Design' for components.

4. INITIAL SETUP:
   - Create '.clinerules' or '.agentic-rules' for the project.
   - Ensure 'git init' and first commit are performed.

EXECUTION STEPS:
1. Setup Convex and define schema in 'convex/schema.ts'.
2. Create mutations for bulk inserting CSV data.
3. Build the 'Lecturer Management' page with Search & Filter by Expertise.
4. Implement the 'Schedule Upload' module.

SAVE: Verify build and commit as 'feat: foundation and csv ingestion logic'.
