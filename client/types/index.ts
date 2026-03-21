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
