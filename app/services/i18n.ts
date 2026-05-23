import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
  createElement,
} from 'react';

export type Language = 'zh' | 'en';

const zh = {
  appName: '拾光',
  tagline: '从互联网拾取免费光影',
  searchPlaceholder: '搜索电影、剧集...',
  searchBtn: '搜索',
  browse: '浏览',
  recentSearches: '最近搜索',
  clear: '清除',
  trending: '热门',
  refresh: '刷新',
  noResults: '没有找到结果',
  noResultsHint: '试试其他关键词：',
  retry: '重试',
  favorites: '收藏',
  noFavorites: '还没有收藏',
  noFavoritesHint: '去搜索页面发现好内容吧',
  sources: '播放源',
  noSources: '暂无可用播放源',
  description: '简介',
  details: '详情',
  search: '搜索',
  movie: '电影',
  series: '剧集',
  documentary: '纪录片',
  favoriteAdd: '收藏',
  favoriteRemove: '取消收藏',
  loading: '加载中...',
  videoError: '视频加载失败',
  videoErrorHint: '请检查网络连接后重试',
  delete: '删除',
  confirmDelete: '确认删除？',
  openExternal: '该视频需在外部打开',
  openInBrowser: '在浏览器中打开',
  langSwitch: 'EN',
  categories: '分类',
  allCategories: '全部分类',
  hotRanking: '热门排行',
  latestUpdates: '最近更新',
  filter: '筛选',
  region: '地区',
  year: '年份',
  all: '全部',
  mainland: '内地',
  hongkong_taiwan: '港台',
  japan_korea: '日韩',
  west: '欧美',
  otherRegion: '其他',
  sortBy: '排序',
  sortLatest: '最新',
  sortHot: '最热',
  sortRating: '评分',
  tvseries: '电视剧',
  variety: '综艺',
  anime: '动漫',
  shortdrama: '短剧',
  sports: '体育',
  education: '知识',
  episodes: '选集',
  noMore: '没有更多了',
  loadMore: '加载更多',
  director: '导演',
  actors: '主演',
  region: '地区',
  language: '语言',
  duration: '时长',
  selectSource: '选择播放源',
  chooseEpisode: '选集',
  youMayAlsoLike: '猜你喜欢',
  expand: '展开',
  collapse: '收起',
  play: '播放',
  watchHistory: '观看历史',
  continueWatching: '继续观看',
  resume: '继续播放',
  noHistory: '还没有观看记录',
  noHistoryHint: '去看看视频吧',
  clearHistory: '清除记录',
  watchingProgress: '已看 {{progress}}',
};

const en: Record<keyof typeof zh, string> = {
  appName: 'Video App',
  tagline: 'Search and stream free videos',
  searchPlaceholder: 'Search movies, series...',
  searchBtn: 'Go',
  browse: 'Browse',
  recentSearches: 'Recent Searches',
  clear: 'Clear',
  trending: 'Trending',
  refresh: 'Refresh',
  noResults: 'No results found',
  noResultsHint: 'Try a different keyword:',
  retry: 'Retry',
  favorites: 'Favorites',
  noFavorites: 'No favorites yet',
  noFavoritesHint: 'Explore and find great content',
  sources: 'Sources',
  noSources: 'No sources available',
  description: 'Description',
  details: 'Details',
  search: 'Search',
  movie: 'Movie',
  series: 'Series',
  documentary: 'Documentary',
  favoriteAdd: 'Favorite',
  favoriteRemove: 'Unfavorite',
  loading: 'Loading...',
  videoError: 'Video failed to load',
  videoErrorHint: 'Check your connection and try again',
  delete: 'Delete',
  confirmDelete: 'Confirm delete?',
  openExternal: 'This video opens externally',
  openInBrowser: 'Open in Browser',
  langSwitch: '中',
  categories: 'Categories',
  allCategories: 'All Categories',
  hotRanking: 'Hot Ranking',
  latestUpdates: 'Latest Updates',
  filter: 'Filter',
  region: 'Region',
  year: 'Year',
  all: 'All',
  mainland: 'Mainland',
  hongkong_taiwan: 'HK/TW',
  japan_korea: 'JP/KR',
  west: 'Western',
  otherRegion: 'Other',
  sortBy: 'Sort By',
  sortLatest: 'Latest',
  sortHot: 'Hottest',
  sortRating: 'Rating',
  tvseries: 'TV Series',
  variety: 'Variety',
  anime: 'Anime',
  shortdrama: 'Short Drama',
  sports: 'Sports',
  education: 'Education',
  episodes: 'Episodes',
  noMore: 'No more',
  loadMore: 'Load more',
  director: 'Director',
  actors: 'Cast',
  region: 'Region',
  language: 'Language',
  duration: 'Duration',
  selectSource: 'Select Source',
  chooseEpisode: 'Episodes',
  youMayAlsoLike: 'You May Also Like',
  expand: 'Expand',
  collapse: 'Collapse',
  play: 'Play',
  watchHistory: 'Watch History',
  continueWatching: 'Continue Watching',
  resume: 'Resume',
  noHistory: 'No watch history',
  noHistoryHint: 'Go watch some videos!',
  clearHistory: 'Clear History',
  watchingProgress: 'Watched {{progress}}',
};

type TranslationMap = typeof zh;

export type TranslationKey = keyof TranslationMap;

const translations: Record<Language, TranslationMap> = { zh, en };

interface I18nContextType {
  lang: Language;
  t: (key: TranslationKey) => string;
  toggleLang: () => void;
  setLang: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('zh');

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'zh' ? 'en' : 'zh'));
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[lang][key] ?? key;
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, t, toggleLang, setLang }),
    [lang, t, toggleLang],
  );

  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
