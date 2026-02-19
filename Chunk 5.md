[CONTEXT: REFER TO CONTEXT7] [UI: UI/UX PRO MAX SKILL] [ENV: MCP SERVER CHECK REQUIRED]

ACT AS: Senior Backend Developer & Algorithm Specialist (Constraint Satisfaction Expert).
CONTEXT: Implementing "Intelligent Pre-Teaching Slot Finder" for TI Unand.

TASK:
Implement the core scheduling algorithm with Alternative Suggestion logic.

ALGORITHM SPECIFICATIONS:
1. INPUT: seminar_id (get 4 lecturers & seminar type).
2. PRIMARY SEARCH (Ideal):
   - Find common free windows across 4 lecturers (Mon-Fri, 08:00-17:00).
   - Require duration: Proposal (>= 60m), Hasil/Sidang (>= 90m) before any lecturer starts teaching.
3. SECONDARY SEARCH (Alternative):
   - If no Ideal slots found, find windows with (Required Duration - 10 minutes).
   - Label these as "Alternative" in the UI.
4. TRANSITION GAP: Always leave 5 minutes for lecturers to reach their classrooms.

TECHNICAL REQUIREMENTS:
1. CONVEX MUTATIONS (scheduling.ts):
   - Create 'getAvailableSlots' query.
   - Use 'teaching_schedules' and 'seminar_requests' (to avoid double booking).
   - Filter results to exclude weekends and non-working hours.

2. UI/UX - SLOT PICKER (Admin Dashboard):
   - Build a clean interface using Shadcn/UI to display results.
   - Use Emerald Green for Ideal slots and Amber Yellow for Alternative slots.
   - Display "Tidak Ada Jadwal Tersedia" message if both searches fail, with a button to "Check Next Week".

3. FINALIZATION:
   - When Admin selects a slot, update 'seminar_requests' with 'scheduled_date', 'start_time', 'end_time', and status 'scheduled'.

EXECUTION STEPS:
1. Write logic to calculate time intersections for 4 specific lecturer IDs in Convex.
2. Ensure the algorithm accounts for the 5-minute transition buffer.
3. Build the responsive 'Slot Recommendation' UI component.
4. Implement the "Alternative Suggestion" flagging logic.

SAVE: Commit as 'logic: intelligent scheduling engine with alternative suggestion strategy'.
