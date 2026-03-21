'use server';

import * as api from '@/lib/api';

export async function getVideoAction(videoId: string) {
  try {
    const result = await api.getVideo(videoId);
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function listVideosAction() {
  try {
    const result = await api.listVideos();
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteVideoAction(videoId: string) {
  try {
    const result = await api.deleteVideo(videoId);
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
