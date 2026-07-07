import React, { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { ArrowLeft, Play, Pause, SkipForward, Radio, Users, Trophy, Sparkles, Volume2, Music, Check, X, AlertCircle } from "lucide-react";
import { playBuzzSound, playSuccessSound, playFailSound, playClickSound } from "../lib/audioEffects";

interface MultiplayerGameViewProps {
  socket: Socket;
  initialRoomState: any;
  isHost: boolean;
  playerName: string;
  onQuit: () => void;
}

export default function MultiplayerGameView({ socket, initialRoomState, isHost, playerName, onQuit }: MultiplayerGameViewProps) {
  const [room, setRoom] = useState<any>(initialRoomState);
  const [feedback, setFeedback] = useState<{ text: string; success: boolean } | null>(null);
  const [gameResult, setGameResult] = useState<{ rankings: any[] } | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const roomRef = useRef<any>(room);

  // Sync roomRef with state changes
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // Initialize client-side Audio
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Synchronize audio playback based on room state
  useEffect(() => {
    if (!audioRef.current || !room || !room.track) return;

    const audio = audioRef.current;
    const currentUrl = room.track.previewUrl;

    if (audio.src !== currentUrl) {
      audio.src = currentUrl;
      audio.load();
    }

    if (room.isPlaying && !room.isBuzzed && !room.isRevealed) {
      audio.play().catch((err) => console.log("Audio play blocked or aborted:", err));
    } else {
      audio.pause();
    }
  }, [room?.isPlaying, room?.isBuzzed, room?.isRevealed, room?.track?.previewUrl]);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket) return;

    const handleRoomState = (state: any) => {
      setRoom(state);
    };

    const handleTimerTick = ({ timeRemaining }: { timeRemaining: number }) => {
      setRoom((prev: any) => (prev ? { ...prev, timeRemaining } : null));
    };

    const handleGuessFeedback = ({ success, text, scores }: { success: boolean; text: string; scores: any[] }) => {
      if (success) {
        playSuccessSound();
      } else {
        playFailSound();
      }
      setFeedback({ text, success });
      setTimeout(() => setFeedback(null), 3500);
    };

    const handlePlayBuzzerSound = () => {
      playBuzzSound();
    };

    const handleResumeAudio = () => {
      if (audioRef.current && roomRef.current?.isPlaying) {
        audioRef.current.play().catch((err) => console.log("Play failed on resume:", err));
      }
    };

    const handleGameOver = (result: { rankings: any[] }) => {
      playSuccessSound();
      setGameResult(result);
    };

    const handleErrorMsg = (msg: string) => {
      alert(msg);
      onQuit();
    };

    socket.on("room_state", handleRoomState);
    socket.on("timer_tick", handleTimerTick);
    socket.on("guess_feedback", handleGuessFeedback);
    socket.on("play_buzzer_sound", handlePlayBuzzerSound);
    socket.on("resume_audio", handleResumeAudio);
    socket.on("game_over", handleGameOver);
    socket.on("error_msg", handleErrorMsg);

    return () => {
      socket.off("room_state", handleRoomState);
      socket.off("timer_tick", handleTimerTick);
      socket.off("guess_feedback", handleGuessFeedback);
      socket.off("play_buzzer_sound", handlePlayBuzzerSound);
      socket.off("resume_audio", handleResumeAudio);
      socket.off("game_over", handleGameOver);
      socket.off("error_msg", handleErrorMsg);
    };
  }, [socket, onQuit]);

  const handleTogglePlay = () => {
    playClickSound();
    socket.emit("toggle_play", { roomCode: room.code });
  };

  const handleBuzz = () => {
    if (!room.isPlaying || room.isBuzzed || room.isRevealed) return;
    socket.emit("buzz", { roomCode: room.code });
  };

  const handleDJAwardPoints = (points: number, type: "artist" | "title" | "both" | "none") => {
    playClickSound();
    socket.emit("dj_award_points", {
      roomCode: room.code,
      points,
      type
    });
  };

  const handleNextTrack = () => {
    playClickSound();
    socket.emit("next_track", { roomCode: room.code });
  };

  const handleRevealTrack = () => {
    playClickSound();
    socket.emit("reveal_track", { roomCode: room.code });
  };

  const confirmQuit = () => {
    playClickSound();
    socket.emit("quit_room", { roomCode: room.code });
    onQuit();
  };

  const amIBuzzed = room?.isBuzzed && room?.buzzedPlayerId === socket.id;

  // 1. GAME OVER VIEW
  if (gameResult) {
    const winners = gameResult.rankings;
    return (
      <div className="flex flex-col h-full bg-transparent text-white p-6 justify-between overflow-y-auto relative z-10">
        <div className="text-center mt-6 animate-fade-in">
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
            <Trophy className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-light tracking-widest uppercase">FIN DE LA <span className="font-extrabold text-orange-500">PARTIE</span></h2>
          <p className="text-slate-400 text-xs mt-1">Félicitations à tous les joueurs !</p>
        </div>

        {/* Podium Display */}
        {winners.length > 0 && (
          <div className="my-8 space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest text-orange-400 uppercase text-center">PODIUM</h3>
            
            <div className="flex items-end justify-center space-x-3 pt-6 pb-2">
              {/* 2nd Place */}
              {winners[1] && (
                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-extrabold text-slate-400 mb-1 truncate max-w-[80px]">{winners[1].name}</div>
                  <div className="w-16 bg-slate-700/60 border border-slate-600 rounded-t-xl flex flex-col items-center justify-center p-2 pt-4 h-24 relative shadow-lg">
                    <span className="text-2xl font-extrabold text-slate-300">2</span>
                    <span className="text-[9px] font-bold text-slate-400 mt-1">{winners[1].score} pts</span>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {winners[0] && (
                <div className="flex flex-col items-center">
                  <span className="text-xl mb-1">👑</span>
                  <div className="text-xs font-black text-orange-400 mb-1 truncate max-w-[90px]">{winners[0].name}</div>
                  <div className="w-20 bg-orange-600/60 border-2 border-orange-500 rounded-t-xl flex flex-col items-center justify-center p-2 pt-6 h-32 relative shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                    <span className="text-3xl font-black text-white">1</span>
                    <span className="text-[10px] font-bold text-white mt-1">{winners[0].score} pts</span>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {winners[2] && (
                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-extrabold text-amber-600 mb-1 truncate max-w-[80px]">{winners[2].name}</div>
                  <div className="w-16 bg-amber-900/40 border border-amber-800/60 rounded-t-xl flex flex-col items-center justify-center p-2 pt-3 h-18 relative shadow-lg">
                    <span className="text-xl font-bold text-amber-600">3</span>
                    <span className="text-[9px] font-bold text-amber-500 mt-1">{winners[2].score} pts</span>
                  </div>
                </div>
              )}
            </div>

            {/* Score List */}
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto bg-black/40 border border-white/5 p-3 rounded-2xl">
              {winners.map((p, i) => (
                <div key={p.id} className="flex justify-between items-center py-1.5 px-2.5 rounded-lg text-xs hover:bg-white/5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-500 w-4">#{i+1}</span>
                    <span className="font-bold text-slate-200">{p.name}</span>
                  </div>
                  <span className="font-extrabold text-orange-400">{p.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={confirmQuit}
          className="w-full py-3.5 bg-white/5 border border-white/10 hover:border-orange-500/30 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition"
        >
          Retour au Menu
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-transparent text-white justify-between relative z-10 p-6 overflow-hidden">
      
      {/* 1. HEADER */}
      <div className="flex items-center justify-between shrink-0 mb-4 pb-3 border-b border-white/5">
        <button
          onClick={() => {
            playClickSound();
            setShowQuitConfirm(true);
          }}
          className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4 text-orange-500" />
        </button>

        <div className="text-center">
          <div className="text-[10px] font-black text-orange-500 tracking-widest uppercase">
            Salon: {room.code}
          </div>
          <div className="text-xs text-slate-400 truncate max-w-[140px] font-bold">
            {room.playlistName}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-black text-slate-300">
            {room.currentIndex + 1} / {room.totalTracks || "?"}
          </div>
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
            Morceaux
          </div>
        </div>
      </div>

      {/* 2. LIVE SCORES BAR */}
      <div className="flex space-x-2 overflow-x-auto py-1 px-1 shrink-0 scrollbar-hide mb-4">
        {room.players?.map((p: any) => {
          const isBuzzed = room.isBuzzed && room.buzzedPlayerId === p.id;
          return (
            <div
              key={p.id}
              className={`flex items-center space-x-2 py-1.5 px-3 rounded-full shrink-0 border transition-all duration-300 ${
                isBuzzed
                  ? "bg-red-500/20 border-red-500 animate-pulse scale-105"
                  : p.isHost
                  ? "bg-orange-500/10 border-orange-500/20"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isBuzzed ? "bg-red-500" : p.isHost ? "bg-orange-500" : "bg-green-500"}`} />
              <div className="text-[11px] font-bold text-slate-200">
                {p.name} <span className="text-orange-400 font-extrabold ml-1">{p.score} pt</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* FLASH FEEDBACK MESSAGES */}
      {feedback && (
        <div className="absolute inset-x-6 top-24 z-50 p-4 rounded-2xl text-center font-bold text-sm bg-black/90 border shadow-2xl animate-fade-in flex items-center justify-center space-x-2">
          {feedback.success ? <Sparkles className="w-5 h-5 text-orange-400 shrink-0" /> : <X className="w-5 h-5 text-red-500 shrink-0" />}
          <span className={feedback.success ? "text-orange-300" : "text-red-400"}>{feedback.text}</span>
        </div>
      )}

      {/* 3. MAIN WORKSPACE / GAME ZONE */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative my-auto">
        
        {/* REVELATION STATE (Active when revealed or time's up) */}
        {room.isRevealed ? (
          <div className="w-full max-w-sm p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center space-y-4 animate-scale-up">
            <div className="relative">
              <img
                src={room.track?.artworkUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop"}
                alt="Artwork"
                className="w-24 h-24 rounded-xl object-cover shadow-2xl border border-white/10 bg-slate-800"
              />
              <div className="absolute -bottom-2 -right-2 bg-green-500 p-1.5 rounded-full border-2 border-[#0a050d] shadow">
                <Check className="w-4 h-4 text-white" />
              </div>
            </div>
            <div>
              <span className="text-[9px] font-black tracking-widest text-orange-400 uppercase">RÉVÉLATION !</span>
              <h4 className="font-extrabold text-base text-slate-100 line-clamp-1 mt-1">{room.track?.title || "Titre"}</h4>
              <p className="text-sm font-bold text-slate-300 mt-0.5 line-clamp-1">{room.track?.artist || "Artiste"}</p>
              {room.track?.album && <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 italic">{room.track.album}</p>}
            </div>

            {isHost && (
              <button
                onClick={handleNextTrack}
                className="w-full py-3 bg-gradient-to-br from-orange-600 to-red-600 hover:opacity-90 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-2 shadow-lg shadow-orange-600/10"
              >
                <span>Morceau Suivant</span>
                <SkipForward className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
          </div>
        ) : (
          /* PLAYING / WAITING STAGE */
          <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-sm">
            
            {/* Countdown circular timer */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  className="stroke-white/5 fill-none"
                  strokeWidth="6"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  className="stroke-orange-500 fill-none transition-all duration-1000"
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 48}`}
                  strokeDashoffset={`${((30 - room.timeRemaining) / 30) * (2 * Math.PI * 48)}`}
                />
              </svg>
              <div className="text-center z-10">
                <div className="text-3xl font-black tracking-tight text-white">{room.timeRemaining}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">secondes</div>
              </div>
            </div>

            {/* SPECIALLY FORMATTED INFO CARDS BASED ON USER GROUP */}
            {isHost ? (
              /* DJ VIEW: ALWAYS SHOW ARTIST/TITLE AND PLAY BACK CONTROL */
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 w-full text-center space-y-3">
                <div>
                  <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest block mb-1">
                    Écran de contrôle du DJ
                  </span>
                  <h4 className="font-extrabold text-sm text-slate-100 line-clamp-1">
                    {room.track?.title || "Chargement..."}
                  </h4>
                  <p className="text-xs font-semibold text-slate-400 line-clamp-1 mt-0.5">
                    {room.track?.artist || "Artiste"}
                  </p>
                </div>

                {/* DJ PLAY CONTROL BUTTON */}
                <div className="flex justify-center space-x-3 pt-1">
                  <button
                    onClick={handleTogglePlay}
                    className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white transition flex items-center justify-center"
                    title={room.isPlaying ? "Pause" : "Lecture"}
                  >
                    {room.isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  </button>
                  <button
                    onClick={handleRevealTrack}
                    className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 rounded-xl text-orange-400 text-[10px] font-black uppercase tracking-wider transition"
                  >
                    Révéler la réponse
                  </button>
                </div>
              </div>
            ) : (
              /* PLAYER VIEW: MUSIC VISUALIZER OR BUZZ LOCK FEEDBACK */
              <div className="text-center w-full">
                {room.isBuzzed ? (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/15 animate-shake">
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block">BUZZ RETENU !</span>
                    <h5 className="font-extrabold text-slate-100 mt-1">
                      {room.buzzedPlayerName}
                    </h5>
                    <p className="text-xs text-slate-400 mt-1">Propose une réponse...</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-12 space-x-1.5 px-4 bg-white/5 rounded-full border border-white/5 mx-auto max-w-xs select-none">
                    {room.isPlaying ? (
                      <>
                        <div className="w-1.5 h-6 bg-orange-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                        <div className="w-1.5 h-8 bg-orange-500 rounded-full animate-bounce [animation-delay:0.3s]" />
                        <div className="w-1.5 h-4 bg-orange-500 rounded-full animate-bounce [animation-delay:0.5s]" />
                        <span className="text-xs font-bold text-slate-300 ml-2">Musique en cours d'écoute...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-3 bg-slate-600 rounded-full" />
                        <div className="w-1.5 h-3 bg-slate-600 rounded-full" />
                        <div className="w-1.5 h-3 bg-slate-600 rounded-full" />
                        <span className="text-xs font-bold text-slate-400 ml-2">Musique en pause (le DJ décide)</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ROUND GUESS HIGHLIGHTS (If player got one field but not the other) */}
            {(room.artistGuessedThisRound || room.titleGuessedThisRound) && !room.isRevealed && (
              <div className="p-3.5 bg-green-500/10 border border-green-500/20 rounded-xl text-xs w-full text-center space-y-1 animate-scale-up">
                <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest block">Trouvés ce tour-ci :</span>
                {room.artistGuessedThisRound && <p className="font-semibold text-slate-200">✅ Artiste trouvé !</p>}
                {room.titleGuessedThisRound && <p className="font-semibold text-slate-200">✅ Titre trouvé !</p>}
              </div>
            )}

            {/* GIANT USER BUZZER BUTTON (Accessible to everyone!) */}
            {!room.isRevealed && (
              <button
                disabled={!room.isPlaying || room.isBuzzed}
                onClick={handleBuzz}
                className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-300 relative group select-none cursor-pointer ${
                  room.isPlaying && !room.isBuzzed
                    ? "bg-gradient-to-br from-red-600 to-orange-600 hover:scale-105 active:scale-95 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.4)]"
                    : "bg-white/5 border-white/10 cursor-not-allowed"
                }`}
              >
                <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping group-hover:duration-500 scale-105 hidden group-hover:block" />
                <span className={`text-base font-black uppercase tracking-widest text-white ${room.isPlaying && !room.isBuzzed && "animate-pulse"}`}>
                  BUZZ
                </span>
                <span className="text-[9px] text-white/55 font-bold tracking-widest uppercase mt-0.5">
                  Tapez ici
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. MODAL FOR BUZZED STATE (Oral Buzzer Mode) */}
      {room?.isBuzzed && (
        <div className="fixed inset-0 bg-[#0a050d]/95 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="w-full max-w-sm p-6 bg-white/5 border border-white/10 rounded-2xl shadow-2xl relative space-y-5">
            
            {isHost ? (
              /* DJ GRADING DASHBOARD */
              <div className="space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center p-2 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 mb-2">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-black text-slate-100">
                    {room.buzzedPlayerId === socket.id ? "🎙️ Vous avez buzzé !" : `🎙️ ${room.buzzedPlayerName} a buzzé !`}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {room.buzzedPlayerId === socket.id ? "Donnez votre réponse et attribuez-vous les points :" : "Le joueur doit donner sa réponse à haute voix !"}
                  </p>
                </div>

                {/* HELP CARD FOR DJ */}
                <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl space-y-2 text-xs">
                  <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest block">La bonne réponse :</span>
                  <div>
                    <span className="text-slate-400">Artiste : </span>
                    <span className="font-bold text-white">{room.track?.artist || "Inconnu"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Titre : </span>
                    <span className="font-bold text-white">{room.track?.title || "Inconnu"}</span>
                  </div>
                </div>

                {/* DJ SCORE ACTION GRID */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    disabled={room.artistGuessedThisRound}
                    onClick={() => handleDJAwardPoints(1, "artist")}
                    className="py-3 bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-500/30 disabled:opacity-30 disabled:hover:bg-indigo-600/80 rounded-xl font-bold uppercase text-[10px] text-white tracking-wider transition"
                  >
                    +1 Pt Artiste
                  </button>
                  <button
                    disabled={room.titleGuessedThisRound}
                    onClick={() => handleDJAwardPoints(1, "title")}
                    className="py-3 bg-purple-600/80 hover:bg-purple-500 border border-purple-500/30 disabled:opacity-30 disabled:hover:bg-purple-600/80 rounded-xl font-bold uppercase text-[10px] text-white tracking-wider transition"
                  >
                    +1 Pt Titre
                  </button>
                  <button
                    onClick={() => handleDJAwardPoints(2, "both")}
                    className="py-3.5 bg-gradient-to-r from-orange-600 to-red-600 hover:opacity-95 rounded-xl font-bold uppercase text-[10px] text-white tracking-wider transition col-span-2 shadow-lg shadow-orange-600/15"
                  >
                    +2 Pts (Les Deux)
                  </button>
                  <button
                    onClick={() => handleDJAwardPoints(0, "none")}
                    className="py-3 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-xl font-bold uppercase text-[10px] text-slate-300 tracking-wider transition col-span-2"
                  >
                    ❌ Faux / 0 Pt
                  </button>
                  <button
                    onClick={handleRevealTrack}
                    className="py-2.5 bg-transparent border border-white/10 hover:bg-white/5 rounded-xl font-bold uppercase text-[9px] text-slate-400 hover:text-slate-300 tracking-wider transition col-span-2 mt-2"
                  >
                    Révéler la réponse directement
                  </button>
                </div>
              </div>
            ) : (
              /* REGULAR PLAYERS VIEW DURING BUZZ */
              <div className="text-center py-6 space-y-5 animate-scale-up">
                {room.buzzedPlayerId === socket.id ? (
                  <>
                    <div className="inline-flex items-center justify-center p-4 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-full animate-bounce">
                      <Radio className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-orange-500 tracking-widest uppercase">C'EST VOTRE TOUR !</span>
                      <h3 className="text-xl font-black text-slate-100 mt-1">VOUS AVEZ BUZZÉ !</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Donnez votre réponse <span className="text-white font-extrabold">de vive voix</span> au DJ !
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center justify-center p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full animate-pulse">
                      <Users className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase">BUZZ EN COURS</span>
                      <h3 className="text-xl font-black text-slate-100 mt-1">{room.buzzedPlayerName}</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Écoutez sa proposition de réponse de vive voix...
                      </p>
                    </div>
                  </>
                )}

                <div className="pt-2">
                  <div className="inline-flex items-center space-x-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 py-1.5 px-4 rounded-full border border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                    <span>En attente de la décision du DJ...</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 5. QUIT CONFIRMATION MODAL */}
      {showQuitConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="w-full max-w-sm p-6 bg-white/5 border border-white/10 rounded-2xl text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto animate-bounce" />
            <div>
              <h4 className="font-extrabold text-base text-slate-100">Quitter la partie ?</h4>
              <p className="text-xs text-slate-400 mt-1">
                {isHost
                  ? "En tant que DJ, cela mettra fin à la partie pour tout le monde et fermera le salon."
                  : "Vous perdrez votre score actuel et retournerez au menu."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  playClickSound();
                  setShowQuitConfirm(false);
                }}
                className="py-3 bg-white/5 border border-white/10 rounded-xl font-bold uppercase text-[10px]"
              >
                Rester
              </button>
              <button
                onClick={confirmQuit}
                className="py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold uppercase text-[10px] text-white"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
