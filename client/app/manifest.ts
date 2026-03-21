import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Learnova — Learn Smarter, Build Faster',
    short_name: 'Learnova',
    description:
      'A full-stack eLearning platform with course management, progress tracking, quizzes, and gamification built for the modern learner.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#3d9970',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/learnova.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/learnova.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
