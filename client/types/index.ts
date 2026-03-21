// Roles
export type Role = 'ADMIN' | 'INSTRUCTOR' | 'LEARNER'

// Lesson types
export type LessonType = 'VIDEO' | 'DOCUMENT' | 'IMAGE' | 'QUIZ'

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

export interface CourseDetail {
  id: number;
  title: string;
  description: string | null;
  tags: string[];
  isPublished: boolean;
  coverImage: string | null;
  websiteUrl: string | null;
  certificateTemplate: string | null;
  visibility: Visibility;
  accessRule: AccessRule;
  instructorId: number;
  courseAdminId: number | null;
  createdAt: string;
  enrollmentCount: number;
  lessons: {
    id: number;
    title: string;
    type: LessonType;
    order: number;
    duration: number | null;
  }[];
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
  duration: number | null;
  thumbnailUrl?: string | null;
  isCompleted?: boolean;
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

export interface UserProfile {
  user: { id: number; name: string | null; email: string };
  totalPoints: number;
  currentBadge: string | null;
  enrollmentCount: number;
  completedCount: number;
}
