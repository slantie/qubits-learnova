# 📚 Learnova — eLearning Platform

> A full-stack, role-based eLearning platform for creating, publishing, and consuming online courses with gamification, progress tracking, and reporting.

---

## Table of Contents

- [Overview](#overview)
- [Roles](#roles)
- [Module A — Instructor / Admin Backoffice](#module-a--instructor--admin-backoffice)
  - [A1. Courses Dashboard](#a1-courses-dashboard)
  - [A2. Course Form (Edit Course)](#a2-course-form-edit-course)
  - [A3. Lessons / Content Management](#a3-lessons--content-management)
  - [A4. Lesson / Content Editor](#a4-lesson--content-editor)
  - [A5. Course Options & Access Rules](#a5-course-options--access-rules)
  - [A6. Quizzes — Instructor View](#a6-quizzes--instructor-view)
  - [A7. Quiz Builder](#a7-quiz-builder)
  - [A8. Reporting Dashboard](#a8-reporting-dashboard)
- [Module B — Learner Website / App](#module-b--learner-website--app)
  - [B1. Website Navbar & Courses Menu](#b1-website-navbar--courses-menu)
  - [B2. My Courses Page](#b2-my-courses-page)
  - [B3. Course Detail Page](#b3-course-detail-page)
  - [B4. Ratings & Reviews Tab](#b4-ratings--reviews-tab)
  - [B5. Full-Screen Lesson Player](#b5-full-screen-lesson-player)
  - [B6. Quiz Flow (Learner Side)](#b6-quiz-flow-learner-side)
  - [B7. Points Popup & Course Completion](#b7-points-popup--course-completion)
- [Business Rules](#business-rules)
- [RBAC Summary](#rbac-summary)
- [Data Entities](#data-entities)
- [Gamification System](#gamification-system)

---

## Overview

Learnova is a two-sided eLearning platform:


| Side              | Who Uses It       | Purpose                                                                                         |
| ----------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| **Backoffice**    | Admin, Instructor | Create & manage courses, lessons, quizzes, attendees; view reporting                            |
| **Website / App** | Learner, Guest    | Browse courses, learn via full-screen player, attempt quizzes, earn points/badges, post reviews |


---

## Roles


| Role           | Description                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Admin**      | Full access to all backoffice features including platform settings, all courses, all reporting, and user management      |
| **Instructor** | Creates and manages own courses, adds lessons and quizzes, publishes courses, adds attendees, views own course reporting |
| **Learner**    | Browses published courses, starts/continues lessons, attempts quizzes, earns points/badges, adds reviews                 |
| **Guest**      | Can view published courses only if visibility is set to "Everyone" — must log in to learn                                |


---

## Module A — Instructor / Admin Backoffice

---

### A1. Courses Dashboard

**Page:** `/backoffice/courses`

The central landing page of the backoffice. Lists all courses created by the instructor (or all courses for Admin).

#### Features


| Feature               | Description                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| **Kanban View**       | Displays courses as cards arranged in columns (e.g., Draft, Published)                                |
| **List View**         | Displays courses as a table with sortable columns                                                     |
| **Toggle View**       | Switch between Kanban and List view via a toggle button                                               |
| **Search Courses**    | Real-time search by course name                                                                       |
| **Course Card Info**  | Shows: title, tags, views count, total lessons count, total duration, Published badge                 |
| **Published Badge**   | A visual badge on the card/row when the course is published to the website                            |
| **Edit Action**       | Opens the Course Form page for full course configuration                                              |
| **Share Action**      | Copies or generates a shareable course link to clipboard                                              |
| **Create Course (+)** | A `+` button opens a small modal — enter course name → course is created and appears in the dashboard |


---

### A2. Course Form (Edit Course)

**Page:** `/backoffice/courses/:courseId/edit`

The main configuration page for a course. Opened via the Edit action from the dashboard.

#### Header Actions


| Feature                       | Description                                                             |
| ----------------------------- | ----------------------------------------------------------------------- |
| **Publish on Website Toggle** | ON/OFF toggle to publish or unpublish the course to the learner website |
| **Preview**                   | Opens the learner-facing course view in a new tab                       |
| **Add Attendees**             | Opens a wizard to enroll learners directly by email invitation          |
| **Contact Attendees**         | Opens a wizard to send a bulk email to all enrolled learners            |
| **Course Image Upload**       | Upload a cover image for the course card and detail page                |


#### Course Fields


| Field                          | Required         | Description                                           |
| ------------------------------ | ---------------- | ----------------------------------------------------- |
| **Title**                      | ✅ Yes            | The course name                                       |
| **Tags**                       | No               | Multi-tag input for categorisation                    |
| **Website URL**                | ✅ When published | The URL where the course is accessible on the website |
| **Responsible / Course Admin** | No               | Select a user as the course administrator             |


#### Tabs


| Tab             | Description                                                                           |
| --------------- | ------------------------------------------------------------------------------------- |
| **Content**     | Manage lessons (see [A3](#a3-lessons--content-management))                            |
| **Description** | Rich text editor for the course-level description shown to learners                   |
| **Options**     | Visibility and access rule configuration (see [A5](#a5-course-options--access-rules)) |
| **Quiz**        | List and manage quizzes for the course (see [A6](#a6-quizzes--instructor-view))       |


---

### A3. Lessons / Content Management

**Page:** `/backoffice/courses/:courseId/edit` → **Content Tab**

The Content tab inside the Course Form. Lists and manages all lessons for a course.

#### Features


| Feature                | Description                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| **Lesson List**        | Ordered list of all lessons with title and type icon                 |
| **Lesson Type Icon**   | Visual indicator for Video, Document, Image, or Quiz lesson types    |
| **3-dot Action Menu**  | Per-lesson menu with Edit and Delete options                         |
| **Edit Lesson**        | Opens the Lesson Editor popup (see [A4](#a4-lesson--content-editor)) |
| **Delete Lesson**      | Removes the lesson after a confirmation dialog                       |
| **Add Content Button** | Opens the Lesson Editor popup in create mode                         |


---

### A4. Lesson / Content Editor

**Page:** Modal/Popup on `/backoffice/courses/:courseId/edit` (Content Tab)

A tabbed popup for creating or editing a single lesson.

#### Tab 1 — Content


| Field                     | Description                                             |
| ------------------------- | ------------------------------------------------------- |
| **Lesson Title**          | Required. The name shown in the lesson list and sidebar |
| **Lesson Type Selector**  | Choose from: Video, Document, Image                     |
| **Responsible Person**    | Optional. Assign a responsible user for this lesson     |
| **Video URL**             | (Video type only) YouTube or Google Drive link          |
| **Duration**              | (Video type only) Lesson duration in minutes/seconds    |
| **Document Upload**       | (Document type only) Upload a file                      |
| **Allow Download Toggle** | (Document type only) Enable/disable learner download    |
| **Image Upload**          | (Image type only) Upload an image file                  |
| **Allow Download Toggle** | (Image type only) Enable/disable learner download       |


#### Tab 2 — Description


| Field                  | Description                                                                     |
| ---------------------- | ------------------------------------------------------------------------------- |
| **Lesson Description** | Rich text / textarea shown to learners at the top of the player for this lesson |


#### Tab 3 — Additional Attachments


| Feature                  | Description                                                       |
| ------------------------ | ----------------------------------------------------------------- |
| **File Upload**          | Upload an extra resource file attached to the lesson              |
| **External Link**        | Add a URL as an external resource attached to the lesson          |
| **Multiple Attachments** | Multiple files and links can be added per lesson                  |
| **Learner Visibility**   | Attachments appear in the learner's sidebar below the lesson name |


---

### A5. Course Options & Access Rules

**Page:** `/backoffice/courses/:courseId/edit` → **Options Tab**

Controls who can see and who can access the course.

#### Visibility Setting


| Option        | Behaviour                                                        |
| ------------- | ---------------------------------------------------------------- |
| **Everyone**  | Course visible to all visitors, including unauthenticated guests |
| **Signed In** | Course visible only to authenticated (logged-in) users           |


#### Access Rule Setting


| Option            | Behaviour                                                                          |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Open**          | Any user who can see the course can start learning immediately                     |
| **On Invitation** | Only users explicitly added as attendees can access lesson content                 |
| **On Payment**    | User must complete a purchase before accessing lessons — reveals a **Price** field |


#### Other Settings


| Field            | Description                                        |
| ---------------- | -------------------------------------------------- |
| **Price**        | (Payment rule only) Set the course price           |
| **Course Admin** | Select a responsible person / course administrator |


> **Note:** Visibility and Access are independent settings. Visibility controls *seeing* the course; Access controls *starting* the course.

---

### A6. Quizzes — Instructor View

**Page:** `/backoffice/courses/:courseId/edit` → **Quiz Tab**

Lists all quizzes associated with the course.

#### Features


| Feature             | Description                                        |
| ------------------- | -------------------------------------------------- |
| **Quiz List**       | Shows all quizzes linked to the course             |
| **Edit Quiz**       | Opens the Quiz Builder page for the selected quiz  |
| **Delete Quiz**     | Deletes the quiz after a confirmation dialog       |
| **Add Quiz Button** | Navigates to the Quiz Builder to create a new quiz |


---

### A7. Quiz Builder

**Page:** `/backoffice/courses/:courseId/quiz/:quizId`

A dedicated page for building quiz questions and configuring attempt-based rewards.

#### Left Panel


| Feature            | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| **Question List**  | Numbered list of all questions (Question 1, Question 2, …) |
| **Add Question**   | Appends a new blank question to the list                   |
| **Rewards Button** | Opens the attempt-based scoring configuration panel        |


#### Question Editor (Right Panel)


| Feature                    | Description                                    |
| -------------------------- | ---------------------------------------------- |
| **Question Text**          | Input field for the question content           |
| **Answer Options**         | Add/remove multiple answer options dynamically |
| **Mark Correct Answer(s)** | Mark one or more options as the correct answer |


#### Rewards Configuration Panel


| Attempt                    | Points Awarded     |
| -------------------------- | ------------------ |
| **1st Attempt**            | X points (highest) |
| **2nd Attempt**            | Y points           |
| **3rd Attempt**            | Z points           |
| **4th Attempt and beyond** | W points (lowest)  |


> Points decrease with each subsequent attempt to incentivise first-try success.

---

### A8. Reporting Dashboard

**Page:** `/backoffice/reporting`

Provides instructors and admins with course-wise learner progress analytics.

#### Overview Cards


| Card                   | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| **Total Participants** | Total number of enrolled learners across courses       |
| **Yet to Start**       | Learners enrolled but haven't opened any lesson        |
| **In Progress**        | Learners who have started but not completed the course |
| **Completed**          | Learners who have completed the entire course          |


> Clicking any card filters the learner table below to show only users in that status.

#### Learner Progress Table


| Column           | Description                                |
| ---------------- | ------------------------------------------ |
| Sr. No.          | Row number                                 |
| Course Name      | Name of the course                         |
| Participant Name | Learner's name                             |
| Enrolled Date    | Date the learner was enrolled              |
| Start Date       | Date the learner opened their first lesson |
| Time Spent       | Total time spent inside lessons            |
| Completion %     | Percentage of lessons completed            |
| Completed Date   | Date the course was marked complete        |
| Status           | Yet to Start / In Progress / Completed     |


#### Column Customisation


| Feature                 | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| **Side Panel**          | A slide-out panel with checkboxes for each column       |
| **Show / Hide Columns** | Toggle individual columns on or off per user preference |


> **Admin** sees all courses from all instructors. **Instructor** sees only their own courses.

---

## Module B — Learner Website / App

---

### B1. Website Navbar & Courses Menu

**Page:** All learner-facing pages (global layout)

The global navigation bar present on all learner-facing pages.

#### Features


| Feature                    | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| **Courses Menu Item**      | A navbar link that navigates to the courses listing               |
| **Courses Listing**        | Displays all published courses subject to visibility rules        |
| **Login / Signup Links**   | Shown to unauthenticated guests in the navbar                     |
| **Visibility Enforcement** | "Signed In" courses are hidden from the navbar listing for guests |


---

### B2. My Courses Page

**Page:** `/courses` or `/my-courses`

The learner's primary dashboard for browsing and continuing courses.

#### Course Cards


| Element               | Description                           |
| --------------------- | ------------------------------------- |
| **Cover Image**       | The course thumbnail                  |
| **Title**             | Course name                           |
| **Short Description** | Brief summary of the course           |
| **Tags**              | Category tags                         |
| **CTA Button**        | State-aware action button (see below) |


#### CTA Button States


| State                  | Button Label  | Condition                              |
| ---------------------- | ------------- | -------------------------------------- |
| Guest                  | `Join Course` | User is not logged in                  |
| Logged in, not started | `Start`       | Enrolled but no lesson opened          |
| In progress            | `Continue`    | At least one lesson started/completed  |
| Paid course            | `Buy Course`  | Payment access rule, not yet purchased |


#### Search


| Feature            | Description                                           |
| ------------------ | ----------------------------------------------------- |
| **Search by Name** | Real-time text search to filter course cards by title |


#### My Profile Panel

> Displayed exclusively on the My Courses page for logged-in learners.


| Element            | Description                                            |
| ------------------ | ------------------------------------------------------ |
| **Total Points**   | Cumulative points earned from all completed quizzes    |
| **Current Badge**  | The learner's current badge based on total points      |
| **Badge Progress** | Visual progress indicator towards the next badge level |


---

### B3. Course Detail Page

**Page:** `/courses/:courseId`

Detailed view of a single course with progress tracking and lesson navigation.

#### Course Overview Tab


| Feature                      | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| **Course Title**             | Full name of the course                            |
| **Cover Image**              | Course thumbnail image                             |
| **Short Description**        | Summary paragraph shown to learners                |
| **Progress Bar**             | Visual bar showing % of lessons completed          |
| **Total Lessons Count**      | Total number of lessons in the course              |
| **Completed Lessons Count**  | Number of lessons the learner has completed        |
| **Incomplete Lessons Count** | Number of remaining lessons                        |
| **Lesson List**              | Ordered list of all lessons with status icons      |
| **Completed Status Icon**    | Blue tick shown on completed lessons               |
| **In Progress Status Icon**  | Indicator for the currently active lesson          |
| **Search Lessons**           | Real-time search to filter the lesson list by name |
| **Open Lesson**              | Clicking any lesson opens the full-screen player   |


---

### B4. Ratings & Reviews Tab

**Page:** `/courses/:courseId` → **Ratings & Reviews Tab**

Community reviews for the course, visible inside the Course Detail Page.

#### Features


| Feature                 | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| **Average Star Rating** | Aggregate star rating displayed prominently                  |
| **Reviews List**        | Each review shows: learner avatar, learner name, review text |
| **Add Review Button**   | Visible only to authenticated, enrolled learners             |
| **Add Review Form**     | Star rating selector (1–5) + free-text review input          |


> Guests and unauthenticated users can view reviews but cannot submit one.

---

### B5. Full-Screen Lesson Player

**Page:** `/courses/:courseId/lessons/:lessonId`

A focused, distraction-free learning interface for consuming lesson content.

#### Left Sidebar


| Feature                    | Description                                  |
| -------------------------- | -------------------------------------------- |
| **Course Title**           | Displayed at the top of the sidebar          |
| **Completion Percentage**  | % of course completed                        |
| **Lesson List**            | All lessons in order with status icons       |
| **Completed Icon**         | Blue tick on completed lessons               |
| **In Progress Icon**       | Indicator on the current lesson              |
| **Additional Attachments** | Listed below each lesson name in the sidebar |
| **Show / Hide Sidebar**    | Toggle button to collapse/expand the sidebar |


#### Main Content Area


| Feature                | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| **Lesson Title**       | Displayed at the top of the main area                          |
| **Lesson Description** | Rich text shown above the content viewer                       |
| **Video Player**       | Embedded video player for Video-type lessons (YouTube / Drive) |
| **Document Viewer**    | In-browser document viewer for Document-type lessons           |
| **Image Viewer**       | Full-size image display for Image-type lessons                 |
| **Quiz View**          | Quiz intro screen or question page for Quiz-type lessons       |


#### Navigation Buttons


| Button           | Description                                 |
| ---------------- | ------------------------------------------- |
| **Back**         | Returns to the My Courses page              |
| **Next Content** | Advances to the next lesson in the sequence |


---

### B6. Quiz Flow (Learner Side)

**Page:** `/courses/:courseId/lessons/:quizLessonId` (Quiz type lesson in the player)

The quiz-taking experience inside the full-screen player.

#### Quiz Intro Screen


| Feature                      | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| **Total Questions**          | Displays the number of questions in the quiz       |
| **Multiple Attempts Notice** | Informs learner that multiple attempts are allowed |
| **Start Quiz Button**        | Begins the quiz and loads the first question       |


#### Question Pages


| Feature                       | Description                                                 |
| ----------------------------- | ----------------------------------------------------------- |
| **One Question per Page**     | Each page shows a single question with its answer options   |
| **Answer Option Selection**   | Learner selects one option                                  |
| **Proceed Button**            | Submits the current answer and loads the next question      |
| **Proceed and Complete Quiz** | Shown on the last question — submits and completes the quiz |


#### Post-Quiz


| Feature                   | Description                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| **Quiz Completed Status** | Quiz marked as completed with a tick icon in the sidebar                                       |
| **Points Awarded**        | Points credited to the learner based on attempt number and reward config                       |
| **Points Popup**          | Pop-up shown immediately after quiz completion (see [B7](#b7-points-popup--course-completion)) |


---

### B7. Points Popup & Course Completion

**Page:** Overlay on `/courses/:courseId/lessons/:lessonId`

Triggered after quiz completion or when all lessons are done.

#### Points Popup


| Feature                   | Description                                                   |
| ------------------------- | ------------------------------------------------------------- |
| **Points Earned Message** | "You have earned X points"                                    |
| **Badge Progress**        | Visual indicator showing progress toward the next badge level |


#### Course Completion


| Feature                         | Description                                                                 |
| ------------------------------- | --------------------------------------------------------------------------- |
| **Complete This Course Button** | Appears when all lessons (including quizzes) are completed                  |
| **Course Marked Complete**      | Clicking the button updates enrollment status to "Completed"                |
| **Reflected in Reporting**      | Completion is immediately reflected in the instructor's reporting dashboard |


---

## Business Rules

### Publishing

- Only **published** courses appear on the learner website.
- Unpublished courses are only visible in the backoffice.

### Visibility vs. Access Interaction


| Visibility | Access Rule   | Effective Behaviour                               |
| ---------- | ------------- | ------------------------------------------------- |
| Everyone   | Open          | Any visitor can see and start the course          |
| Everyone   | On Invitation | Any visitor can see; only invited users can start |
| Everyone   | On Payment    | Any visitor can see and purchase the course       |
| Signed In  | Open          | Only logged-in users can see and start            |
| Signed In  | On Invitation | Only logged-in invited users can see and start    |
| Signed In  | On Payment    | Only logged-in users can see and purchase         |


### Progress Tracking

- Progress tracked at the **lesson level** (completed / not completed).
- Course completion % = `(completed lessons / total lessons) × 100`
- Course can only be marked complete when **all** lessons are completed.

### Quiz Scoring

- Multiple attempts are always allowed.
- Points decrease with each subsequent attempt per the reward configuration.
- Total accumulated points from all quizzes across all courses determine badge level.

### Download Rules

- Documents and images are downloadable **only if** the instructor enables "Allow Download".
- Additional attachments are always downloadable by enrolled learners.

---

## RBAC Summary


| Feature Area                   | Admin   | Instructor | Learner | Guest           |
| ------------------------------ | ------- | ---------- | ------- | --------------- |
| Courses Dashboard (Backoffice) | ✅       | ✅ (own)    | ❌       | ❌               |
| Create / Edit / Delete Course  | ✅       | ✅ (own)    | ❌       | ❌               |
| Publish / Unpublish Course     | ✅       | ✅          | ❌       | ❌               |
| Manage Lessons & Attachments   | ✅       | ✅          | ❌       | ❌               |
| Build Quizzes & Set Rewards    | ✅       | ✅          | ❌       | ❌               |
| Add / Contact Attendees        | ✅       | ✅          | ❌       | ❌               |
| View Reporting Dashboard       | ✅ (all) | ✅ (own)    | ❌       | ❌               |
| Platform Settings & User Mgmt  | ✅       | ❌          | ❌       | ❌               |
| Browse Published Courses       | ✅       | ✅          | ✅       | ✅ (if Everyone) |
| Start / Continue Learning      | ✅       | ✅          | ✅       | ❌               |
| Attempt Quizzes                | ✅       | ✅          | ✅       | ❌               |
| Earn Points & Badges           | ✅       | ✅          | ✅       | ❌               |
| Add Ratings & Reviews          | ✅       | ✅          | ✅       | ❌               |
| View Reviews                   | ✅       | ✅          | ✅       | ✅               |


---

## Data Entities


| Entity             | Key Fields                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| **Course**         | id, title, tags, description, coverImage, isPublished, visibility, accessRule, price, courseAdminId     |
| **Lesson**         | id, courseId, title, type (Video|Document|Image|Quiz), url, filePath, allowDownload, description, order |
| **Attachment**     | id, lessonId, type (File|Link), filePath, externalUrl, label                                            |
| **Quiz**           | id, courseId, title, questions[]                                                                        |
| **Question**       | id, quizId, text, options[], correctOptions[]                                                           |
| **QuizReward**     | id, quizId, attempt1Points, attempt2Points, attempt3Points, attempt4PlusPoints                          |
| **User**           | id, name, email, role, totalPoints, currentBadge                                                        |
| **Enrollment**     | id, userId, courseId, enrolledAt, startedAt, completedAt, status, timeSpent                             |
| **LessonProgress** | id, enrollmentId, lessonId, isCompleted, completedAt                                                    |
| **QuizAttempt**    | id, userId, quizId, attemptNumber, answers[], pointsEarned, completedAt                                 |
| **Review**         | id, userId, courseId, rating (1–5), reviewText, createdAt                                               |


---

## Gamification System

### Badge Levels


| Badge         | Points Required |
| ------------- | --------------- |
| 🟤 Newbie     | 20 points       |
| 🔵 Explorer   | 40 points       |
| 🟢 Achiever   | 60 points       |
| 🟣 Specialist | 80 points       |
| 🟠 Expert     | 100 points      |
| 🔴 Master     | 120 points      |


### How Points Work

1. Learner completes a quiz → points awarded based on attempt number.
2. Points are cumulative across all courses and quizzes.
3. Badge level is automatically upgraded when a points threshold is crossed.
4. Progress toward the next badge is shown in the Profile Panel and Points Popup.

---

*Learnova — Built for the modern learning experience.*