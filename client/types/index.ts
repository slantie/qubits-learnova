// Roles
export type Role = 'ADMIN' | 'INSTRUCTOR' | 'LEARNER'

// Lesson types
export type LessonType =
  | 'VIDEO' | 'DOCUMENT' | 'IMAGE' | 'QUIZ'
  | 'ARTICLE' | 'PDF' | 'AUDIO' | 'QUIZ_BLOCK'
  | 'ASSIGNMENT' | 'LINK_BLOCK' | 'IFRAME' | 'SURVEY' | 'FEEDBACK_GATE'

// Visibility & Access
export type Visibility = 'EVERYONE' | 'SIGNED_IN'
export type AccessRule = 'OPEN' | 'ON_INVITATION' | 'ON_PAYMENT'

// Enrollment status
export type EnrollmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'

// Attachment types
export type AttachmentType = 'FILE' | 'LINK'

export interface User {
  id: number;
  email: string;
  name?: string;
  role: Role;
  avatarUrl?: string;
}

export interface Section {
  id: number;
  courseId: number;
  title: string;
  order: number;
  isLocked: boolean;
  description: string | null;
  lessons: LessonSummary[];
}

export interface CourseDetail {
  id: number;
  title: string;
  description: string | null;
  tags: string[];
  isPublished: boolean;
  coverImage: string | null;
  websiteUrl: string | null;
  certificateTemplate: string | null;
  certThreshold: number | null;
  expiryDays: number | null;
  price: string | null;
  earlyBirdPrice: string | null;
  earlyBirdLimit: number | null;
  earlyBirdEnrolledCount: number;
  visibility: Visibility;
  accessRule: AccessRule;
  instructorId: number;
  courseAdminId: number | null;
  createdAt: string;
  enrollmentCount: number;
  sections: Section[];
  lessons: LessonSummary[]; // unsectioned lessons
  quizzes: { id: number; title: string }[];
}

export interface VideoTimestamp {
  time: number;
  label: string;
  description?: string;
}

export interface Lesson {
  id: number;
  courseId: number;
  sectionId: number | null;
  title: string;
  type: LessonType;
  order: number;
  duration: number | null;
  filePath: string | null;
  videoUrl: string | null;
  videoId: string | null;
  videoStatus: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  content: string | null;
  timestamps: VideoTimestamp[] | null;
  richContent: string | null;
  iframeUrl: string | null;
  quizBlockId: number | null;
  attachmentsCount: number;
}

export interface Attachment {
  id: number;
  lessonId: number;
  type: AttachmentType;
  label: string;
  filePath: string | null;
  externalUrl: string | null;
}

export interface Course {
  id: number;
  title: string;
  tags: string[];
  isPublished: boolean;
  lessonCount: number;
  totalDuration: number;
  coverImage: string | null;
  createdAt: string;
}

// ─── Learner types ────────────────────────────────────────────────────────────

export interface LearnerEnrollment {
  id: number;
  status: EnrollmentStatus;
  enrolledAt?: string;
  progressPct: number;
  completedLessons: number;
  incompleteLessons: number;
  totalLessons?: number;
}

export interface LearnerCourse {
  id: number;
  title: string;
  description: string | null;
  coverImage: string | null;
  tags: string[];
  accessRule: AccessRule;
  price: string | null;
  visibility: Visibility;
  totalDuration?: number;
  instructor: { id: number; name: string | null } | null;
  _count: { lessons: number; enrollments: number };
  enrollment?: LearnerEnrollment;
}

export interface LessonSummary {
  id: number;
  title: string;
  type: LessonType;
  order: number;
  sectionId: number | null;
  duration: number | null;
  thumbnailUrl?: string | null;
  isCompleted?: boolean;
  iframeUrl?: string | null;
  richContent?: unknown | null;
  quizBlockId?: number | null;
  filePath?: string | null;
  videoUrl?: string | null;
  videoStatus?: string | null;
  description?: string | null;
}

export interface LearnerSectionSummary {
  id: number;
  title: string;
  order: number;
  isLocked: boolean;
  lessons: LessonSummary[];
}

export interface LearnerCourseDetail {
  id: number;
  title: string;
  description: string | null;
  coverImage: string | null;
  tags: string[];
  accessRule: AccessRule;
  price: string | null;
  visibility: Visibility;
  instructor: { id: number; name: string | null } | null;
  sections: LearnerSectionSummary[];
  lessons: LessonSummary[];
  quizzes: { id: number; title: string; _count: { questions: number } }[];
  _count: { lessons: number; enrollments: number };
  enrollment?: LearnerEnrollment;
}

export interface CourseProgress {
  completedLessonIds: number[];
  progressPct: number;
  status: EnrollmentStatus;
  totalLessons: number;
  completedLessons: number;
}

export interface ReviewData {
  id: number;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  user: { id: number; name: string | null };
}

export interface ReviewsResponse {
  reviews: ReviewData[];
  averageRating: number;
  totalCount: number;
}

export interface EarnedBadge {
  badgeKey: string;
  earnedAt: string;
}

export interface UserProfile {
  user: { id: number; name: string | null; email: string; createdAt?: string };
  totalPoints: number;
  currentBadge: string | null;
  enrollmentCount: number;
  completedCount: number;
  badges: EarnedBadge[];
}

export interface PublicProfile {
  user: { id: number; name: string | null; createdAt: string };
  totalPoints: number;
  currentBadge: string | null;
  enrollmentCount: number;
  completedCount: number;
  badges: EarnedBadge[];
}

// ─── Badge types ──────────────────────────────────────────────────────────────

export type BadgeCategory =
  | 'TIER'
  | 'COURSE_MILESTONE'
  | 'QUIZ_EXCELLENCE'
  | 'SPEED'
  | 'CERTIFICATION'
  | 'DEDICATION';

export interface BadgeStatusItem {
  key: string;
  name: string;
  category: BadgeCategory;
  description: string;
  trigger: string;
  earned: boolean;
  earnedAt: string | null;
  progress?: { current: number; required: number };
}

export interface BadgeStatusList {
  badges: BadgeStatusItem[];
}
