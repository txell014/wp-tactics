import { useCallback, useState } from "react";
import { ActionContextMenu } from "./components/ActionContextMenu";
import { Header } from "./components/header/Header";
import { PoolCanvas } from "./components/pool/PoolCanvas";
import { Sidebar } from "./components/sidebar/Sidebar";
import { Timeline } from "./components/Timeline";
import { DEFAULT_POOL_VIEW, LAYOUT_RESERVED_PX, SHOW_TIMELINE_IN_BOARD_MODE, VIEW_DIMS } from "./constants/pool";
import { DEFAULT_APP_MODE, DEFAULT_PLAY_TITLE } from "./constants/ui";
import { useFrames } from "./hooks/useFrames";
import { usePlayback } from "./hooks/usePlayback";
import { useVideoExport } from "./hooks/useVideoExport";
import type { AppMode, ContextMenuState, PoolView } from "./types";

export default function App() {
  const framesApi = useFrames();
  const { frames, frame, activeFrame, setActiveFrame } = framesApi;
  const playback = usePlayback({ frameCount: frames.length, activeFrame, setActiveFrame });

  const [appMode, setAppMode] = useState<AppMode>(DEFAULT_APP_MODE);
  const [poolView, setPoolView] = useState<PoolView>(DEFAULT_POOL_VIEW);
  const [playTitle, setPlayTitle] = useState(DEFAULT_PLAY_TITLE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showPaths, setShowPaths] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [swapColors, setSwapColors] = useState(false);

  const closeContext = useCallback(() => setContextMenu(null), []);
  const openContext = useCallback((id: string, other: string | null, x: number, y: number) => setContextMenu({ id, other, x, y }), []);

  const clearSelection = () => {
    setSelectedId(null);
    setContextMenu(null);
  };

  const { exporting, exportVideo } = useVideoExport({
    view: poolView,
    appMode,
    setAppMode,
    activeFrame,
    seekToFrame: playback.seekToFrame,
    seekToTime: playback.seekToTime,
    totalDuration: playback.totalDuration,
    playTitle,
    onBeforeExport: () => {
      playback.pause();
      clearSelection();
    },
  });

  const handleTogglePlay = () => {
    if (!playback.playing) {
      setAppMode("animacio"); // la interpolació només existeix en mode animació
      clearSelection();
    }
    playback.togglePlay();
  };

  const handleModeChange = (mode: AppMode) => {
    setAppMode(mode);
    if (mode === "pissarra") playback.seekToFrame(activeFrame); // atura i alinea el temps amb el frame actual
  };
  const handleViewChange = (mode: PoolView) => {
    setPoolView(mode);
    clearSelection();
  };

  const handleAddFrame = () => playback.seekToFrame(framesApi.addFrame());

  const handleDeleteFrame = (index: number) => {
    const next = framesApi.deleteFrame(index);
    if (next !== null) playback.seekToFrame(next);
  };

  const handleReset = () => {
    framesApi.resetFrames();
    playback.stop();
    clearSelection();
  };

  const { w: viewW, h: viewH } = VIEW_DIMS[poolView];
  const timelineVisible = appMode === "animacio" || SHOW_TIMELINE_IN_BOARD_MODE;
  const reservedPx = timelineVisible ? LAYOUT_RESERVED_PX.withTimeline : LAYOUT_RESERVED_PX.withoutTimeline;

  return (
    <div className="flex flex-col h-screen bg-[#0a0f1e] overflow-hidden select-none">
      <Header
        playTitle={playTitle}
        onTitleChange={setPlayTitle}
        appMode={appMode}
        onModeChange={handleModeChange}
        poolView={poolView}
        onViewChange={handleViewChange}
        playing={playback.playing}
        looping={playback.looping}
        elapsed={playback.elapsed}
        totalDuration={playback.totalDuration}
        showPaths={showPaths}
        exporting={exporting}
        onTogglePlay={handleTogglePlay}
        onStop={playback.stop}
        onToggleLoop={playback.toggleLooping}
        onReset={handleReset}
        onTogglePaths={() => setShowPaths(p => !p)}
        onExport={exportVideo}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex items-center justify-center bg-[#080e1c] p-3 overflow-hidden">
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              width: `min(100%, calc((100vh - ${reservedPx}px) * ${viewW}/${viewH}))`,
              aspectRatio: `${viewW}/${viewH}`,
              boxShadow: "0 0 0 1px #1e2d42, 0 8px 40px rgba(0,0,0,0.6), 0 0 60px rgba(0,212,212,0.05)",
            }}
          >
            <PoolCanvas
              view={poolView}
              frames={frames}
              activeFrame={activeFrame}
              selectedId={selectedId}
              appMode={appMode}
              elapsed={playback.elapsed}
              frameDuration={playback.frameDuration}
              showPaths={showPaths}
              showLegend={showLegend}
              swapColors={swapColors}
              hideFakeIcons={playback.playing || exporting}
              onSelectPlayer={setSelectedId}
              onMovePlayer={framesApi.movePlayer}
              onMoveBall={framesApi.moveBall}
              onContextMenu={openContext}
              onCloseContext={closeContext}
            />
            {exporting && <div className="absolute inset-0 z-40 cursor-wait" />}
          </div>
        </main>

        <Sidebar
          frame={frame}
          selectedId={selectedId}
          swapColors={swapColors}
          showLegend={showLegend}
          locked={exporting}
          onSelect={setSelectedId}
          onToggleBall={framesApi.toggleBallPossession}
          onToggleVisibility={framesApi.toggleVisibility}
          onToggleColors={() => setSwapColors(p => !p)}
          onToggleLegend={() => setShowLegend(p => !p)}
        />
      </div>

      {timelineVisible && (
        <Timeline
          frames={frames}
          activeFrame={activeFrame}
          elapsed={playback.elapsed}
          frameDuration={playback.frameDuration}
          swapColors={swapColors}
          locked={exporting}
          onSelectFrame={playback.seekToFrame}
          onAddFrame={handleAddFrame}
          onDeleteFrame={handleDeleteFrame}
          onChangeDuration={playback.changeFrameDuration}
        />
      )}

      {appMode === "animacio" && contextMenu && frame.players[contextMenu.id] && (
        <ActionContextMenu menu={contextMenu} frame={frame} onToggle={framesApi.toggleAction} onClose={closeContext} />
      )}
    </div>
  );
}
