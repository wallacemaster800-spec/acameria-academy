import { useRef, useEffect, useState, useCallback } from "react";
import Hls from "hls.js";
import { Button } from "@/components/ui/button";
import { Play, Pause, Maximize, Minimize } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface VideoPlayerProps {
  src: string;
  watermarkEmail?: string;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  initialTime?: number;
}

export function VideoPlayer({ src, watermarkEmail, onTimeUpdate, onEnded, initialTime = 0 }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState("1");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qualities, setQualities] = useState<{ id: number; label: string }[]>([]);
  const [currentQuality, setCurrentQuality] = useState("-1");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels = hls.levels.map((l, i) => ({
          id: i,
          label: `${l.height}p`,
        }));
        setQualities([{ id: -1, label: "Auto" }, ...levels]);
        if (initialTime > 0) video.currentTime = initialTime;
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        if (initialTime > 0) video.currentTime = initialTime;
      });
    }
  }, [src, initialTime]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    setDuration(v.duration || 0);
    onTimeUpdate?.(v.currentTime);
  }, [onTimeUpdate]);

  const handleSeek = useCallback((val: number[]) => {
    const v = videoRef.current;
    if (v) v.currentTime = val[0];
  }, []);

  const handleSpeedChange = useCallback((val: string) => {
    setSpeed(val);
    if (videoRef.current) videoRef.current.playbackRate = parseFloat(val);
  }, []);

  const handleQualityChange = useCallback((val: string) => {
    setCurrentQuality(val);
    if (hlsRef.current) hlsRef.current.currentLevel = parseInt(val);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-lg bg-black group">
      <video
        ref={videoRef}
        className="w-full aspect-video"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => { setPlaying(false); onEnded?.(); }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onClick={togglePlay}
      />

      {watermarkEmail && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-4">
          <span className="text-xs text-foreground/20 select-none">{watermarkEmail}</span>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={handleSeek}
          className="mb-2"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={togglePlay} className="h-8 w-8 text-foreground">
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <span className="text-xs text-foreground/70">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Select value={speed} onValueChange={handleSpeedChange}>
              <SelectTrigger className="h-7 w-16 border-0 bg-transparent text-xs text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="1.5">1.5x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
              </SelectContent>
            </Select>
            {qualities.length > 1 && (
              <Select value={currentQuality} onValueChange={handleQualityChange}>
                <SelectTrigger className="h-7 w-20 border-0 bg-transparent text-xs text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {qualities.map((q) => (
                    <SelectItem key={q.id} value={q.id.toString()}>
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-8 w-8 text-foreground">
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
