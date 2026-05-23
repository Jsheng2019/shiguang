import type { VideoType, CategorySection } from '../spiders/base.js';

export const CATEGORIES: CategorySection[] = [
  { type: 'movie', label: '电影', icon: '🎬' },
  { type: 'tvseries', label: '电视剧', icon: '📺' },
  { type: 'variety', label: '综艺', icon: '🎯' },
  { type: 'anime', label: '动漫', icon: '🎨' },
  { type: 'documentary', label: '纪录片', icon: '🌍' },
  { type: 'shortdrama', label: '短剧', icon: '⚡' },
  { type: 'sports', label: '体育', icon: '⚽' },
  { type: 'education', label: '知识', icon: '📚' },
];

const labelMap: Record<VideoType, string> = {
  movie: '电影',
  tvseries: '电视剧',
  variety: '综艺',
  anime: '动漫',
  documentary: '纪录片',
  shortdrama: '短剧',
  sports: '体育',
  education: '知识',
};

const iconMap: Record<VideoType, string> = {
  movie: '🎬',
  tvseries: '📺',
  variety: '🎯',
  anime: '🎨',
  documentary: '🌍',
  shortdrama: '⚡',
  sports: '⚽',
  education: '📚',
};

export function getCategoryLabel(type: VideoType): string {
  return labelMap[type] ?? '未知';
}

export function getCategoryIcon(type: VideoType): string {
  return iconMap[type] ?? '❓';
}
