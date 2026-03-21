import { api } from '@/lib/api';
import type {
  LearnerCourse,
  LearnerCourseDetail,
  CourseProgress,
  ReviewsResponse,
  UserProfile,
  PublicProfile,
} from '@/types';

// ─── Course Discovery ─────────────────────────────────────────────────────────

export const fetchPublishedCourses = async (): Promise<LearnerCourse[]> => {
  const data = await api.get('/learner');
  return data?.courses ?? [];
};

export const fetchCourseDetail = async (courseId: number): Promise<LearnerCourseDetail> => {
  return api.get(`/learner/courses/${courseId}`);
};

// ─── Enrollment ───────────────────────────────────────────────────────────────

export const fetchMyCourses = async (): Promise<LearnerCourse[]> => {
  const data = await api.get('/learner/my-courses');
  return data?.courses ?? [];
};

export const enrollInCourse = async (courseId: number) => {
  return api.post(`/learner/courses/${courseId}/enroll`);
};

// ─── Progress ─────────────────────────────────────────────────────────────────

export const fetchCourseProgress = async (courseId: number): Promise<CourseProgress> => {
  return api.get(`/learner/courses/${courseId}/progress`);
};

export const markLessonComplete = async (courseId: number, lessonId: number) => {
  return api.post(`/learner/courses/${courseId}/lessons/${lessonId}/complete`);
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const fetchCourseReviews = async (courseId: number): Promise<ReviewsResponse> => {
  return api.get(`/learner/courses/${courseId}/reviews`);
};

export const submitReview = async (
  courseId: number,
  data: { rating: number; reviewText?: string },
) => {
  return api.post(`/learner/courses/${courseId}/reviews`, data);
};

export const updateReview = async (
  courseId: number,
  data: { rating: number; reviewText?: string },
) => {
  return api.patch(`/learner/courses/${courseId}/reviews`, data);
};

export const deleteReview = async (courseId: number) => {
  return api.delete(`/learner/courses/${courseId}/reviews`);
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export const fetchProfile = async (): Promise<UserProfile> => {
  return api.get('/learner/profile');
};

export const fetchPublicProfile = async (userId: number): Promise<PublicProfile> => {
  return api.get(`/learner/users/${userId}/profile`);
};

// ─── Payment ──────────────────────────────────────────────────────────────────

export const mockPayment = async (courseId: number) => {
  return api.post(`/learner/courses/${courseId}/payment/mock`);
};
