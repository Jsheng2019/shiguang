import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { ResizeMode, Video, AVPlaybackStatus } from 'expo-av';
import { VideoSource } from '../services/api';
import { Colors } from '../theme/colors';
import { useI18n } from '../services/i18n';

interface VideoPlayerProps {
  source: VideoSource;
  onClose?: () => void;
}

const SPEEDS = [0.5, 1, 1.5, 2] as const;

function formatTime(ms: number): string {
  if (!isFinite(ms) || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoPlayer({ source, onClose }: VideoPlayerProps) {
  const { t } = useI18n();

  // For embed sources (YouTube, etc.), open externally
  React.useEffect(() => {
    if (source.format === 'embed') {
      Linking.openURL(source.url).catch(() => {});
      onClose?.();
    }
  }, [source.format, source.url, onClose]);

  if (source.format === 'embed') {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorTitle}>{t('openExternal')}</Text>
        <TouchableOpacity
          onPress={() => { Linking.openURL(source.url).catch(() => {}); onClose?.(); }}
          style={styles.errorBtn}
        >
          <Text style={styles.errorBtnText}>{t('openInBrowser')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(1); // default 1x
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const progressTrackRef = useRef<View>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPlaying = status?.isLoaded ? status.isPlaying : false;
  const position = status?.isLoaded ? status.positionMillis ?? 0 : 0;
  const duration = status?.isLoaded ? status.durationMillis ?? 0 : 0;
  const progress = duration > 0 ? position / duration : 0;

  const handleStatusUpdate = useCallback((s: AVPlaybackStatus) => {
    setStatus(s);
    if (!s.isLoaded) {
      if (s.error) {
        setPlaybackError(s.error);
        setLoadingVideo(false);
      }
      // not loaded but no error yet = still loading
      return;
    }
    // Successfully loaded — clear any prior error and mark loaded
    setPlaybackError(null);
    setLoadingVideo(false);
  }, []);

  const hideControlsAfterDelay = useCallback(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  }, []);

  const togglePlay = useCallback(async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    hideControlsAfterDelay();
  }, [isPlaying, hideControlsAfterDelay]);

  const seek = useCallback(
    async (deltaMs: number) => {
      if (!videoRef.current) return;
      const newPos = Math.min(Math.max(position + deltaMs, 0), duration);
      await videoRef.current.setPositionAsync(newPos);
      hideControlsAfterDelay();
    },
    [position, duration, hideControlsAfterDelay],
  );

  const toggleControls = useCallback(() => {
    setShowControls((v) => {
      if (!v) hideControlsAfterDelay();
      return !v;
    });
  }, [hideControlsAfterDelay]);

  const cycleSpeed = useCallback(async () => {
    const nextIdx = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(nextIdx);
    if (videoRef.current) {
      await videoRef.current.setRateAsync(SPEEDS[nextIdx], true);
    }
    hideControlsAfterDelay();
  }, [speedIdx, hideControlsAfterDelay]);

  const toggleFullscreen = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (isFullscreen) {
        await videoRef.current.dismissFullscreenPlayer();
      } else {
        await videoRef.current.presentFullscreenPlayer();
      }
      setIsFullscreen(!isFullscreen);
    } catch {
      // fullscreen not supported on this platform
    }
    hideControlsAfterDelay();
  }, [isFullscreen, hideControlsAfterDelay]);

  const handleProgressBarPress = useCallback(
    async (event: { nativeEvent: { locationX: number } }) => {
      if (!videoRef.current || !duration) return;
      progressTrackRef.current?.measureInWindow((_x, _y, width) => {
        const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / width));
        const newPos = ratio * duration;
        videoRef.current?.setPositionAsync(newPos);
      });
      hideControlsAfterDelay();
    },
    [duration, hideControlsAfterDelay],
  );

  const handleRetry = useCallback(() => {
    setPlaybackError(null);
    setLoadingVideo(true);
    if (videoRef.current) {
      videoRef.current.loadAsync(
        { uri: source.url, headers: source.headers },
        { shouldPlay: true },
      );
    }
  }, [source]);

  const currentSpeed = SPEEDS[speedIdx];

  // Error state
  if (playbackError) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorIcon}>!</Text>
        <Text style={styles.errorTitle}>{t('videoError')}</Text>
        <Text style={styles.errorHint}>{t('videoErrorHint')}</Text>
        <View style={styles.errorActions}>
          <TouchableOpacity onPress={handleRetry} style={styles.errorBtn}>
            <Text style={styles.errorBtnText}>{t('retry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.errorBtnSecondary}>
            <Text style={styles.errorBtnSecondaryText}>X {t('details')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isFullscreen && styles.fullscreen]}>
      <TouchableOpacity activeOpacity={1} onPress={toggleControls} style={styles.touchArea}>
        <Video
          ref={videoRef}
          source={{ uri: source.url, headers: source.headers }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          useNativeControls={false}
          onPlaybackStatusUpdate={handleStatusUpdate}
        />
      </TouchableOpacity>

      {/* Loading overlay */}
      {loadingVideo && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      )}

      {showControls && (
        <View style={styles.controls} pointerEvents="box-none">
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} style={styles.btn}>
              <Text style={styles.btnText}>X</Text>
            </TouchableOpacity>
            <View style={styles.topRight}>
              <TouchableOpacity onPress={cycleSpeed} style={styles.speedBtn}>
                <Text style={styles.speedText}>{currentSpeed}x</Text>
              </TouchableOpacity>
              <Text style={styles.quality}>{source.quality}</Text>
            </View>
          </View>

          {/* Center controls */}
          <View style={styles.centerRow}>
            <TouchableOpacity onPress={() => seek(-10000)} style={styles.sideBtn}>
              <Text style={styles.sideBtnText}>{'<<'} 10s</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePlay} style={styles.playBtn}>
              <Text style={styles.playIcon}>{isPlaying ? '||' : '▶'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => seek(10000)} style={styles.sideBtn}>
              <Text style={styles.sideBtnText}>10s {'>>'}</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom bar */}
          <View style={styles.bottomBar}>
            <Text style={styles.time}>{formatTime(position)}</Text>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.progressTrack}
              onPress={handleProgressBarPress}
              ref={progressTrackRef}
            >
              <View style={styles.progressTrackBg}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <View style={[styles.progressThumb, { left: `${progress * 100}%` }]} />
            </TouchableOpacity>
            <Text style={styles.time}>{formatTime(duration)}</Text>
            <TouchableOpacity onPress={toggleFullscreen} style={styles.btn}>
              <Text style={styles.btnIcon}>{isFullscreen ? '↙' : '↗'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  fullscreen: {
    ...StyleSheet.absoluteFillObject,
    aspectRatio: undefined,
    zIndex: 999,
  },
  touchArea: {
    ...StyleSheet.absoluteFillObject,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  btnIcon: {
    color: Colors.text,
    fontSize: 16,
  },
  speedBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  speedText: {
    color: Colors.warning,
    fontSize: 13,
    fontWeight: '700',
  },
  quality: {
    color: Colors.text,
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  centerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  sideBtn: {
    padding: 12,
  },
  sideBtnText: {
    color: Colors.text,
    fontSize: 13,
  },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: Colors.text,
    fontSize: 24,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    gap: 8,
  },
  time: {
    color: Colors.text,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    flex: 1,
    height: 24,
    justifyContent: 'center',
    position: 'relative',
  },
  progressTrackBg: {
    height: 4,
    backgroundColor: Colors.textTertiary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    marginLeft: -7,
    top: 5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.text,
    fontSize: 13,
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    aspectRatio: 16 / 9,
  },
  errorIcon: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.error,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  errorBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorBtnText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  errorBtnSecondary: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorBtnSecondaryText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
