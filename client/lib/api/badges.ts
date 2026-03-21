import { api } from '@/lib/api';
import { BadgeStatusList } from '@/types';

export function fetchBadges(): Promise<BadgeStatusList> {
  return api.get('/badges');
}
