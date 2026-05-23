import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { ResizeMode, Video, AVPlaybackStatus } from 'expo-av';
import { VideoSource } from '../services/api';
import { Colors } from '../theme/colors';

interface VideoPlayerProps {
  source: VideoSource;
  onClose?: () => void;
}

function formatTime(ms: number): string {
  if (!isFinite(ms) || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoPlayer({ source, onClose }: VideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [showControls, setShowControls] = useState(true);

  const isPlaying = status?.isLoaded ? status.isPlaying : false;
  const position = status?.isLoaded ? status.positionMillis ?? 0 : 0;
  const duration = status?.isLoaded ? status.durationMillis ?? 0 : 0;
  const progress = duration > 0 ? position / duration : 0;

  const togglePlay = useCallback(async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  }, [isPlaying]);

  const seek = useCallback(
    async (deltaMs: number) => {
      if (!videoRef.current) return;
      const newPos = Math.min(Math.max(position + deltaMs, 0), duration);
      await videoRef.current.setPositionAsync(newPos);
    },
    [position, duration],
  );

  const toggleControls = useCallback(() => {
    setShowControls((v) => !v);
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={1} onPress={toggleControls} style={styles.touchArea}>
        <Video
          ref={videoRef}
          source={{ uri: source.url, headers: source.headers }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          useNativeControls={false}
          onPlaybackStatusUpdate={setStatus}
        />
      </TouchableOpacity>

      {showControls && (
        <View style={styles.controls} pointerEvents="box-none">
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} style={styles.btn}>
              <Text style={styles.btnText}>X</Text>
            </TouchableOpacity>
            <Text style={styles.quality}>{source.quality}</Text>
          </View>

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

          <View style={styles.bottomBar}>
            <Text style={styles.time}>{formatTime(position)}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { flex: progress }]} />
              <View style={{ flex: Math.max(1 - progress, 0.001) }} />
            </View>
            <Text style={styles.time}>{formatTime(duration)}</Text>
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
    height: 4,
    backgroundColor: Colors.textTertiary,
    borderRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});
