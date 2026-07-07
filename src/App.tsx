import React, { useState, useEffect } from "react";
import HomeView from "./components/HomeView";
import LocalSetup from "./components/LocalSetup";
import OnlineSetup from "./components/OnlineSetup";
import GameView from "./components/GameView";
import GameOverView from "./components/GameOverView";
import MultiplayerSetup from "./components/MultiplayerSetup";
import MultiplayerGameView from "./components/MultiplayerGameView";
import { Track, RoundResult } from "./types";
import { Wifi, Battery, Signal, Volume2 } from "lucide-react";

type ActiveView =
  | "HOME"
  | "LOCAL_SETUP"
  | "ONLINE_SETUP"
  | "GAMEPLAY"
  | "GAME_OVER"
  | "MULTIPLAYER_SETUP"
  | "MULTIPLAYER_GAMEPLAY";

export default function App() {
  const [view, setView] = useState<ActiveView>("HOME");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlistName, setPlaylistName] = useState("");
  const [finalScore, setFinalScore] = useState(0);
  const [finalResults, setFinalResults] = useState<RoundResult[]>([]);
  
  // Multiplayer states
  const [mpSocket, setMpSocket] = useState<any>(null);
  const [mpRoomState, setMpRoomState] = useState<any>(null);
  const [mpIsHost, setMpIsHost] = useState(false);
  const [mpPlayerName, setMpPlayerName] = useState("");
  
  // Mobile Clock state
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectMode = (mode: "LOCAL" | "ONLINE" | "MULTIPLAYER") => {
    if (mode === "LOCAL") {
      setView("LOCAL_SETUP");
    } else if (mode === "ONLINE") {
      setView("ONLINE_SETUP");
    } else {
      setView("MULTIPLAYER_SETUP");
    }
  };

  const handleStartGame = (gameTracks: Track[], name: string = "Blind Test") => {
    setTracks(gameTracks);
    setPlaylistName(name);
    setView("GAMEPLAY");
  };

  const handleStartMultiplayerGame = (socket: any, roomState: any, isHost: boolean, pName: string) => {
    setMpSocket(socket);
    setMpRoomState(roomState);
    setMpIsHost(isHost);
    setMpPlayerName(pName);
    setView("MULTIPLAYER_GAMEPLAY");
  };

  const handleGameOver = (score: number, results: RoundResult[]) => {
    setFinalScore(score);
    setFinalResults(results);
    setView("GAME_OVER");
  };

  const handleRestart = () => {
    // Re-shuffles current tracks for replayability
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    setTracks(shuffled);
    setView("GAMEPLAY");
  };

  const handleGoHome = () => {
    setTracks([]);
    setPlaylistName("");
    setFinalScore(0);
    setFinalResults([]);
    if (mpSocket) {
      mpSocket.disconnect();
      setMpSocket(null);
    }
    setMpRoomState(null);
    setMpIsHost(false);
    setView("HOME");
  };

  return (
    <div className="min-h-screen w-full bg-[#0a050d] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.12),transparent)] flex items-center justify-center p-0 md:p-6 font-sans">
      
      {/* Aesthetic outer atmospheric visual helper (visible on desktop) */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-orange-500/5 rounded-full blur-[120px] -z-10 hidden lg:block" />
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-red-500/5 rounded-full blur-[120px] -z-10 hidden lg:block" />

      {/* MOBILE DEVICE SIMULATION FRAME */}
      <div className="relative w-full h-screen md:h-[820px] md:w-[390px] md:rounded-[48px] md:border-[10px] md:border-white/10 bg-[#0a050d] md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden flex flex-col transition-all">
        
        {/* Phone Notch/Dynamic Island mockup (visible on desktop) */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-white/10 rounded-b-2xl z-50 hidden md:block" />

        {/* Smartphone Status Bar */}
        <div className="bg-[#0a050d] px-6 pt-3 pb-1.5 flex justify-between items-center text-xs text-slate-400 font-bold tracking-tight select-none z-30 shrink-0">
          <span className="text-[11px] font-extrabold">{currentTime}</span>
          
          <div className="flex items-center space-x-1.5">
            <Volume2 className="w-3.5 h-3.5 text-slate-500" />
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4 text-slate-350 fill-current" />
          </div>
        </div>

        {/* SCROLLABLE VIEWPORT CONTENT */}
        <main className="flex-1 overflow-hidden relative">
          {view === "HOME" && (
            <HomeView onSelectMode={handleSelectMode} />
          )}

          {view === "LOCAL_SETUP" && (
            <LocalSetup
              onBack={handleGoHome}
              onStartGame={(localTracks) => handleStartGame(localTracks, "Mes MP3 Locaux")}
            />
          )}

          {view === "ONLINE_SETUP" && (
            <OnlineSetup
              onBack={handleGoHome}
              onStartGame={handleStartGame}
            />
          )}

          {view === "GAMEPLAY" && (
            <GameView
              tracks={tracks}
              playlistName={playlistName}
              onGameOver={handleGameOver}
              onQuit={handleGoHome}
            />
          )}

          {view === "GAME_OVER" && (
            <GameOverView
              score={finalScore}
              totalTracks={tracks.length}
              results={finalResults}
              onRestart={handleRestart}
              onGoHome={handleGoHome}
            />
          )}

          {view === "MULTIPLAYER_SETUP" && (
            <MultiplayerSetup
              onBack={handleGoHome}
              onStartMultiplayerGame={handleStartMultiplayerGame}
            />
          )}

          {view === "MULTIPLAYER_GAMEPLAY" && (
            <MultiplayerGameView
              socket={mpSocket}
              initialRoomState={mpRoomState}
              isHost={mpIsHost}
              playerName={mpPlayerName}
              onQuit={handleGoHome}
            />
          )}
        </main>

        {/* Simulated Home Indicator Bar (visible on desktop mockup) */}
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-28 h-1 bg-slate-800 rounded-full z-45 hidden md:block" />
      </div>
    </div>
  );
}
