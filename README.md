# Learnova — eLearning Platform
## By Qubits | Hackathon 2026 — Product README
### Design Specification & Feature Documentation

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Authentication — Login & Sign Up Pages](#2-authentication--login--sign-up-pages)
3. [Admin / Organizer (Backend) View](#3-admin--organizer-backend-view)
   - 3.1 [Courses Kanban & List View](#31-courses--kanban--list-view)
   - 3.2 [Reporting View](#32-reporting-menu)
   - 3.3 [Course Form View](#33-course-form-view)
   - 3.4 [Content Management (Video / Document / Image)](#34-content-tab--content-management)
   - 3.5 [Quiz Builder](#35-quiz-tab--quiz-builder)
   - 3.6 [Options Tab — Access & Pricing](#36-options-tab--access--pricing)
4. [Participant / Portal (Front-End) View](#4-participant--portal-front-end-view)
   - 4.1 [My Courses Page](#41-my-courses-page)
   - 4.2 [Course Detail & Enrolment](#42-course-detail--enrolment)
   - 4.3 [Content Viewer](#43-content-viewer)
   - 4.4 [Quiz Flow](#44-quiz-flow)
   - 4.5 [Badges & Gamification](#45-badges--gamification)
5. [Data Models & Column Definitions](#5-data-models--column-definitions)
6. [Business Rules & Logic](#6-business-rules--logic)

---

## 1. Overview & Architecture

Learnova (by Qubits) is a full-stack eLearning solution with two distinct user roles:

- **Admin / Organizer** — manages courses from a backend dashboard
- **Participant / Portal User** — consumes content through a front-end interface

The system supports **free**, **invite-only**, and **paid** courses with built-in quiz, gamification, and reporting features.

---

## 2. Authentication — Login & Sign Up Pages

### 2.1 Login Page

| Element | Details |
|---|---|
| Fields | Email, Password |
| Action | SIGN IN button |
| Footer links | Forget Password \| Sign Up |
| Validation | Match credentials against DB; on failure display: *"Invalid credentials"* |

### 2.2 Sign Up Page

| Element | Details |
|---|---|
| Fields | Name, Email, Password, Re-Enter Password |
| Action | SIGN UP button |
| On success | Create a new user record in the database |

**Validation checklist:**
- Name of user
- Valid Email ID format
- Password == Re-Enter Password (must match)

### 2.3 Super Admin Account

- Create / log in with one **super user (Admin)** who holds all platform rights
- Permissions include: create a website, manage and create courses, assign other admins, etc.

---

## 3. Admin / Organizer (Backend) View

Accessible after Admin login. Top navigation bar: **App Logo | Courses | Reporting | Settings**

---

### 3.1 Courses — Kanban & List View

#### Navigation & Search

- **Search bar** — search courses by name
- **View toggle** — Kanban View / List View
- **`+ Create Course` button** — opens a pop-up wizard to create a new course

#### Kanban View — Course Card

Each card displays:

| Element | Description |
|---|---|
| Course title | Name of the course |
| Tags | With `×` remove button — admin can delete tags from the card |
| Views | How many views the course has received |
| Contents | Number of content items in the course |
| Duration | Total duration (MM:SS format) |
| Share button | Generates and shares a course link to a specific person |
| Edit button | Opens the Course Form View |
| Published toggle | Green = published on website; Grey = unpublished |

#### Sample Courses (from mockup)

| Course Name | Views | Contents | Duration | Status |
|---|---|---|---|---|
| Introduction to Odoo AI | 15 | 6 | 25:30 | Published |
| Basics of Odoo CRM | 20 | 8 | 20:35 | Published |
| About Odoo Courses | 10 | 5 | 10:20 | Published |

---

### 3.2 Reporting Menu

- The **Reporting menu** opens a dedicated form view displaying all course-level reports (course-wise)
- Clicking a course card in the admin view shows a **participant-level reporting table** in the adjacent column
- The table is **customisable** — columns can be shown or hidden via a toggle

#### Reporting Table Columns

| Column | Description |
|---|---|
| S. No. | Row index |
| Course Name | Name of the enrolled course |
| Participant Name | Full name of the enrolled participant |
| Enrolled Date | Date the participant enrolled |
| Start Date | Date the participant started the course |
| Time Spent | Total time spent on the course (HH:MM) |
| Completion % | Percentage of course completed |
| Completed Date | Date course was finished |
| Status | In Progress / Completed / Yet to Start |

#### Summary Stats (top of reporting column)

- **Total Participants**
- **Yet to Start**
- **In Progress**
- **Completed**

> 💡 By clicking on course cards, the related data/reports are shown in the column below.

---

### 3.3 Course Form View

Opened via the **Edit** button on a course card or via **New**.

#### Header Action Buttons

| Button | Function |
|---|---|
| New | Opens a clean form view for a new course |
| Contact Attendees | Send a message to enrolled attendees |
| Add Attendees | Manually add participants |
| Publish on Website | Toggle — green = published; displays label on the website |
| Share on Web | Share the course URL |
| Preview | Opens the front-end (participant) view for preview |

#### Course Fields

| Field | Description |
|---|---|
| Course Title | e.g., *"Basics of Odoo CRM"* |
| Tags | Add/remove tags; admin clicks `×` to remove a tag |
| Responsible | Name of the responsible person for the course |
| Course Image | Upload an image shown on the website course card |

#### Tabs inside the Course Form

1. **Content**
2. **Description**
3. **Options**
4. **Quiz**

---

### 3.4 Content Tab — Content Management

Lists all content items with columns: **Content Title | Category**

Each row has a **three-dot (⋯) menu**:
- **Edit** — opens the content pop-up/wizard for editing
- **Delete** — shows a confirmation dialog before deleting

**"Add Content"** button opens a pop-up to add a new content item.

---

#### Video Content

| Field | Details |
|---|---|
| Content Title | Name of the content item |
| Tabs | Content \| Description \| Additional Attachment |
| Content Category | Video / Document / Image (selector) |
| Video Link | Google Drive link or YouTube link |
| Responsible | Assigned person |
| Duration | HH:MM hours |

#### Document Content

All fields from Video, plus:
- **Document File** — Upload file button (opens system file picker)
- **Allow Download** toggle — when ON, participant can download the file

#### Image Content

All fields from Video, plus:
- **Image File** — Upload image button
- **Allow Download** toggle — when ON, participant can download the image

#### Additional Attachment Sub-tab

- **File** field — external link (e.g., `www.google.com`)
- Clicking **Upload** triggers a wizard to upload a document from the system

#### Description Tab

Free-text description field: *"Write your content description here..."*

---

### 3.5 Quiz Tab — Quiz Builder

#### Question List

Questions appear as a numbered list in the sidebar. When a new question is created it is added to the list.

- **Add Question** button — appends a new question
- Each question has: question text, multiple-choice answers (Answer 1, 2, 3…), **Correct** checkbox
- **Add Choice** button — adds additional answer options
- **Correct** column — checkbox to mark the correct answer and award points

> To edit, after clicking Edit, the Question page opens to allow editing any quiz questions.

#### Rewards Section

Defines how many points a participant earns based on attempt number:

| Attempt | Points |
|---|---|
| First try | 10 points |
| Second try | 7 points |
| Third try | 5 points |
| Fourth try and beyond | 2 points |

---

### 3.6 Options Tab — Access & Pricing

#### Access Course Rights

**"Show course to"** — defines who can see the course:
- Everyone
- Signed In

**"Access rules"** — defines how people can enrol:
- **Open** — anyone can join
- **On Invitation** — enrolment by invitation only
- **On Payment** — paid course; when selected, displays a **Price** field

#### Pricing

When **"On Payment"** is selected:
- Price field is displayed (e.g., `INR 500`)
- This marks the course as paid

> 💡 When the 'On Payment' rule is selected, the price field appears so the admin can set the course price.

#### Course Admin / Responsible

- **Course Admin** field — decides who is responsible for the course (dropdown of users)

---

## 4. Participant / Portal (Front-End) View

The front-end is what the enrolled participant sees.
Top navigation: **Company Name | Sign In / Username**

---

### 4.1 My Courses Page

Displays all **published and enrolled** courses for the logged-in user.
Includes a **search bar** to search courses.

#### Course Card (Front-End)

| Element | Description |
|---|---|
| Course Cover Image | Visual thumbnail |
| Course Title | Name of the course |
| Short Description | Brief overview |
| Tags | Tag 1, Tag 2 … |
| Progress Bar | Visual % completion indicator |
| % Completed | e.g., *30% Completed* |
| Contents count | Total \| Completed \| Incomplete |
| Action button | See enrolment buttons in §4.2 |

#### My Profile Section

> The 'My Profile' section is only visible on the My Courses page.

- Displays the **profile picture** of the user
- Shows all earned **Badges** with corresponding points
- A **"Back"** button returns to the My Courses page

---

### 4.2 Course Detail & Enrolment

Clicking a course card opens its detail page with two tabs:
**Course Overview | Ratings and Reviews**

#### Enrolment / Action Buttons

| Button | Condition |
|---|---|
| **Join Course** | User is NOT logged in — clicking shows a login prompt |
| **START** | User is logged in and has not yet started the course |
| **Continue** | Course is in progress |
| **Buy Course + INR 500** | Course is paid — opens payment flow |
| **Complete this course** | All content completed — clicking marks course as complete |

> When the course is paid, a **'Paid'** label is displayed on the course card.

#### Course Overview Tab

- Content list with progress checkmarks (`v` = completed, shown in blue)
- **Search content** within the course
- Total Questions count
- Multiple Attempts indicator

#### Ratings and Reviews Tab

- Average star rating displayed (e.g., `4.5 ★`)
- **"Add Review"** button — user can write a review
- All submitted reviews are listed below the rating

---

### 4.3 Content Viewer

Clicking a content item opens a **full-screen view**.

| Element | Description |
|---|---|
| Back button | Returns to My Courses page |
| Sidebar | Course title + % Completed; content list |
| Sidebar toggle | Show / Hide the content list |
| Content items | Document, Video, Quiz listed in order |
| Completed items | Shown in blue with tick (`v`) |
| Additional attachment | Displayed below the content name |
| **Next Content** button | Navigate to the next content item |

---

### 4.4 Quiz Flow

#### Quiz Landing Screen

- Displays: Total Questions count, Multiple Attempts flag
- **"Start Quiz"** button

> The quiz questions display **one question per page**. Click 'Start' to begin.

#### Question Page

| Element | Description |
|---|---|
| Progress indicator | *"Question X of Y"* |
| Question text | Displayed prominently |
| Answer choices | Choice 1, Choice 2, Choice 3 … |
| Proceed button | Submits the selected answer and moves to next question |

> When the user selects an answer, they must click **Proceed** to advance.

#### Last Question

- Button changes to: **"Proceed and Complete Quiz"**
- After submission, the quiz result screen is shown

#### Quiz Result — "Bingo!" Screen

| Element | Description |
|---|---|
| 🎉 "Bingo!" | Success header |
| Points this attempt | e.g., *5 Points* |
| Running total | e.g., *20 Points* |
| Grand total | e.g., *100 Points* |
| Message | *"Reach the next rank to gain more points."* |
| Button | "Proceed and Complete Quiz" |

---

### 4.5 Badges & Gamification

Total points accumulate across all quizzes. The badge label changes dynamically according to total points gained.

| Badge | Points Required |
|---|---|
| 🥉 Newbie | 20 Points |
| 🗺️ Explorer | 40 Points |
| 🏆 Achiever | 60 Points |
| ⭐ Specialist | 80 Points |
| 🔥 Expert | 100 Points |
| 👑 Master | 120 Points |

---

## 5. Data Models & Column Definitions

### 5.1 Course

| Field | Type | Notes |
|---|---|---|
| Title | String | Required |
| Tags | Many2many | Removable by admin (`×` button) |
| Responsible | Many2one (User) | Assigned admin/responsible person |
| Course Image | Binary/URL | Displayed on website card |
| Published | Boolean | Toggle — green when published |
| Access Rule | Selection | Open / On Invitation / On Payment |
| Price | Float | Visible only when Access Rule = On Payment |
| Show Course To | Selection | Everyone / Signed In |
| Course Admin | Many2one (User) | Dropdown of users |

### 5.2 Content

| Field | Type | Notes |
|---|---|---|
| Content Title | String | Required |
| Category | Selection | Video / Document / Image / Quiz |
| Video Link | URL | Google Drive or YouTube — for Video category |
| Document File | Binary | Upload — for Document category |
| Image File | Binary | Upload — for Image category |
| Allow Download | Boolean | For Document and Image categories |
| Additional Attachment | URL/Link | External link (e.g., www.example.com) |
| Description | Text | Free-text content description |
| Responsible | Many2one (User) | |
| Duration | Float | HH:MM — for Video category |

### 5.3 Participant Enrolment

| Column | Type | Notes |
|---|---|---|
| Course Name | Many2one (Course) | |
| Participant Name | Many2one (User) | |
| Enrolled Date | Date | |
| Start Date | Date | |
| Time Spent | Float | HH:MM |
| Completion % | Integer | 0–100 |
| Completed Date | Date | |
| Status | Selection | Yet to Start / In Progress / Completed |

---

## 6. Business Rules & Logic

### 6.1 Authentication

- **Login**: match email + password against DB; on failure show *"Invalid credentials"* error
- **Sign-up**: validate all four fields; create user record on success
- One **super-user (Admin)** with all platform rights must be seeded

### 6.2 Course Publishing

- Toggle **Publish on Website**: ON = green, course visible to participants; OFF = hidden
- **"Published"** badge appears on the course card in kanban/list view when published

### 6.3 Content Access

| Rule | Behaviour |
|---|---|
| Open | Any logged-in user can enrol |
| On Invitation | Only invited users can access |
| On Payment | User must pay (price field required); shows 'Paid' label on card |

### 6.4 Progress Tracking

- Each content item can be: **Not Started / In Progress / Completed**
- Completed items shown in **blue with tick (`v`)** in sidebar and overview
- Course completion % = `(completed items / total items) × 100`
- Course marked **Completed** only when user clicks *"Complete this course"* after all content done

### 6.5 Quiz Logic

- One question displayed **per page**
- User selects a choice then clicks **Proceed** to advance
- Last question shows **"Proceed and Complete Quiz"**
- Points awarded based on attempt number: First = 10 pts, Second = 7, Third = 5, Fourth+ = 2
- After quiz completion, show **Bingo!** screen with earned points and running total
- Quiz completed status shown with tick (`v`) in content sidebar

### 6.6 Gamification / Badges

- Total points accumulate across **all quizzes**
- Badge upgrades automatically when point threshold is crossed
- Progression: **Newbie (20) → Explorer (40) → Achiever (60) → Specialist (80) → Expert (100) → Master (120)**

### 6.7 Reporting

- **Reporting menu** opens course-wise reporting form
- Clicking a course card in admin view shows **participant-level reporting** in the adjacent column
- **Customisable table**: columns can be shown or hidden via toggle
- Summary counters: Total Participants, Yet to Start, In Progress, Completed

### 6.8 Share Link

- **Share** button on course card generates a shareable course link
- Purpose: share the course link to a **specific person** (targeted sharing)

---

*— Learnova by Qubits — End of README —*
