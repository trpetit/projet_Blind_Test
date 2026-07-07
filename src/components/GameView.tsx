import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, SkipForward, Music, Award, HelpCircle, Check, X, AlertCircle, Loader2 } from "lucide-react";
import { Track, RoundResult } from "../types";
import { compareTexts } from "../lib/textMatcher";
import { playBuzzSound, playSuccessSound, playFailSound, playClickSound } from "../lib/audioEffects";

interface GameViewProps {
  tracks: Track[];
  playlistName: string;
  onGameOver: (score: number, roundResults: RoundResult[]) => void;
  onQuit: () => void;
}

export default function GameView({ tracks, playlistName, onGameOver, onQuit }: GameViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuzzed, setIsBuzzed] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [playingUrl, setPlayingUrl] = useState("");
  const [isRevealed, setIsRevealed] = useState(false);

  // Score states
  const [score, setScore] = useState(0);
  const [artistGuessed, setArtistGuessed] = useState(false);
  const [titleGuessed, setTitleGuessed] = useState(false);

  // Input states
  const [artistInput, setArtistInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [guessFeedback, setGuessFeedback] = useState<{
    show: boolean;
    artistOk: boolean;
    titleOk: boolean;
    text: string;
  }>({ show: false, artistOk: false, titleOk: false, text: "" });

  // History tracking
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = tracks[currentIndex];

  // 1. Handle loading and falling back to iTunes API if track previewUrl is missing
  useEffect(() => {
    if (!currentTrack) return;

    setIsPlaying(false);
    setIsBuzzed(false);
    setIsRevealed(false);
    setArtistGuessed(false);
    setTitleGuessed(false);
    setArtistInput("");
    setTitleInput("");
    setTimeRemaining(30);
    setGuessFeedback({ show: false, artistOk: false, titleOk: false, text: "" });

    let url = currentTrack.previewUrl;
    
    if (!url) {
      setIsLoadingAudio(true);
      fetch(`/api/tracks/preview?artist=${encodeURIComponent(currentTrack.artist)}&title=${encodeURIComponent(currentTrack.title)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.previewUrl) {
            setPlayingUrl(data.previewUrl);
            if (data.artworkUrl && !currentTrack.artworkUrl) {
              currentTrack.artworkUrl = data.artworkUrl;
            }
          } else {
            // No preview found anywhere
            setPlayingUrl("");
            setIsRevealed(true); // Auto reveal answers as we can't play it
          }
        })
        .catch((err) => console.error("Error getting preview fallback:", err))
        .finally(() => setIsLoadingAudio(false));
    } else {
      setPlayingUrl(url);
    }
  }, [currentIndex, currentTrack]);

  // 2. Play/Pause controller
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.warn("Autoplay was prevented. User must click play.", err);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, playingUrl]);

  // 3. Sync clock time update
  const handleTimeUpdate = () => {
    if (!audioRef.current || isBuzzed || isRevealed) return;

    const elapsed = audioRef.current.currentTime;
    const remaining = Math.max(0, 30 - elapsed);
    setTimeRemaining(Math.ceil(remaining));

    if (elapsed >= 30) {
      handleTimeOut();
    }
  };

  // 4. Handles when the 30 seconds run out
  const handleTimeOut = () => {
    setIsPlaying(false);
    setIsRevealed(true);
    playFailSound();

    // Log the fail round
    const result: RoundResult = {
      track: currentTrack,
      artistCorrect: artistGuessed,
      titleCorrect: titleGuessed,
      artistGuess: artistInput || "(Temps écoulé)",
      titleGuess: titleInput || "(Temps écoulé)",
      pointsAwarded: (artistGuessed ? 1 : 0) + (titleGuessed ? 1 : 0),
    };
    setRoundResults((prev) => [...prev, result]);
  };

  // 5. Handles Buzzing!
  const handleBuzz = () => {
    if (!isPlaying || isBuzzed || isRevealed) return;

    playBuzzSound();
    setIsPlaying(false);
    setIsBuzzed(true);
    setGuessFeedback({ show: false, artistOk: false, titleOk: false, text: "" });
  };

  // 6. Submit guess
  const handleSubmitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBuzzed) return;

    const correctArtist = currentTrack.artist;
    const correctTitle = currentTrack.title;

    // Check if correct (only check if they haven't found them yet)
    const isArtistCorrect = artistGuessed || compareTexts(artistInput, correctArtist, true);
    const isTitleCorrect = titleGuessed || compareTexts(titleInput, correctTitle, false);

    const justFoundArtist = !artistGuessed && isArtistCorrect;
    const justFoundTitle = !titleGuessed && isTitleCorrect;

    // Compute points awarded on this specific guess
    let newPoints = 0;
    if (justFoundArtist) newPoints += 1;
    if (justFoundTitle) newPoints += 1;

    setScore((prev) => prev + newPoints);

    // Save found status
    if (isArtistCorrect) setArtistGuessed(true);
    if (isTitleCorrect) setTitleGuessed(true);

    if (isArtistCorrect && isTitleCorrect) {
      // BOTH CORRECT! Round over!
      playSuccessSound();
      setIsBuzzed(false);
      setIsRevealed(true);
      setGuessFeedback({
        show: true,
        artistOk: true,
        titleOk: true,
        text: "Gagné ! Artiste + Titre correct !",
      });

      // Save round result
      const result: RoundResult = {
        track: currentTrack,
        artistCorrect: true,
        titleCorrect: true,
        artistGuess: artistInput || correctArtist,
        titleGuess: titleInput || correctTitle,
        pointsAwarded: 2,
      };
      setRoundResults((prev) => [...prev, result]);
    } else {
      // INCOMPLETE OR INCORRECT
      playFailSound();
      setIsBuzzed(false);

      let feedbackText = "Faux ! Réessayez.";
      if (isArtistCorrect && !isTitleCorrect) {
        feedbackText = "Artiste correct ! Trouvez le titre.";
      } else if (!isArtistCorrect && isTitleCorrect) {
        feedbackText = "Titre correct ! Trouvez l'artiste.";
      }

      setGuessFeedback({
        show: true,
        artistOk: isArtistCorrect,
        titleOk: isTitleCorrect,
        text: feedbackText,
      });

      // Clear the wrong fields
      if (!isArtistCorrect) setArtistInput("");
      if (!isTitleCorrect) setTitleInput("");

      // Resume playing
      setIsPlaying(true);
    }
  };

  // 7. Skip track / Pass
  const handleSkip = () => {
    playClickSound();
    setIsPlaying(false);
    setIsBuzzed(false);
    setIsRevealed(true);

    // Log pass result
    const result: RoundResult = {
      track: currentTrack,
      artistCorrect: artistGuessed,
      titleCorrect: titleGuessed,
      artistGuess: artistInput || "(Passé)",
      titleGuess: titleInput || "(Passé)",
      pointsAwarded: (artistGuessed ? 1 : 0) + (titleGuessed ? 1 : 0),
    };
    setRoundResults((prev) => [...prev, result]);
  };

  // 8. Move to next track
  const handleNextTrack = () => {
    playClickSound();
    if (currentIndex + 1 < tracks.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Game ended
      onGameOver(score, roundResults);
    }
  };

  return (
    <div className="flex flex-col h-full justify-between p-6 bg-transparent text-white select-none relative z-10">
      {/* 1. Header Details */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mt-2">
        <div className="min-w-0">
          <span className="text-[10px] font-bold tracking-widest text-orange-400 uppercase">
            {playlistName}
          </span>
          <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider mt-0.5">
            Musique {currentIndex + 1} / {tracks.length}
          </h3>
        </div>
        <div className="flex items-center bg-white/5 px-3 py-1.5 rounded-full border border-white/10 shrink-0">
          <Award className="w-4 h-4 text-orange-500 mr-1.5" />
          <span className="font-extrabold text-sm text-orange-500">{score} <span className="text-white/30 font-normal text-xs">pts</span></span>
        </div>
      </div>

      {/* Secret audio node */}
      {playingUrl && (
        <audio
          ref={audioRef}
          src={playingUrl}
          onTimeUpdate={handleTimeUpdate}
          onCanPlay={() => {
            // Optional auto play can go here
          }}
        />
      )}

      {/* 2. Main Game Arena */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Loading Overlay */}
        {isLoadingAudio && (
          <div className="absolute inset-0 bg-[#0a050d]/80 backdrop-blur-md z-20 flex flex-col items-center justify-center space-y-3 rounded-2xl">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-xs text-slate-400">Recherche de l'extrait audio...</p>
          </div>
        )}

        {/* Unavailable Audio Alert */}
        {!playingUrl && !isLoadingAudio && !isRevealed && (
          <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10 max-w-xs space-y-3">
            <AlertCircle className="w-8 h-8 text-orange-500 mx-auto animate-pulse" />
            <h4 className="font-bold text-sm text-slate-200">Morceau indisponible</h4>
            <p className="text-xs text-slate-400">
              Aucun aperçu sonore de 30s n'a pu être trouvé pour "{currentTrack.title}".
            </p>
            <button
              onClick={handleSkip}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold rounded-xl transition"
            >
              Passer
            </button>
          </div>
        )}

        {/* TIME BAR */}
        {!isRevealed && !isBuzzed && playingUrl && (
          <div className="w-full max-w-xs mb-8">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5 font-bold tracking-wider">
              <span>TEMPS RESTANT</span>
              <span className={timeRemaining <= 5 ? "text-red-500 animate-pulse font-extrabold" : "text-orange-500 font-bold"}>
                {timeRemaining} s
              </span>
            </div>
            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full transition-all duration-1000 rounded-full ${
                  timeRemaining <= 5 ? "bg-red-500 animate-pulse" : "bg-gradient-to-r from-orange-500 to-red-600"
                }`}
                style={{ width: `${(timeRemaining / 30) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* THE GIANT BUZZER PANEL */}
        {!isRevealed && playingUrl && (
          <div className="flex flex-col items-center justify-center space-y-6 relative">
            {/* Outer Glow behind Buzzer */}
            {isPlaying && (
              <div className="absolute w-72 h-72 bg-orange-500/20 rounded-full blur-[80px] -z-10 animate-pulse" />
            )}
            
            <button
              id="game-buzzer"
              disabled={!isPlaying || isBuzzed}
              onClick={handleBuzz}
              className={`relative group w-48 h-48 rounded-full flex flex-col items-center justify-center transition-all duration-300 transform outline-none select-none ${
                isPlaying
                  ? "bg-gradient-to-br from-orange-600 to-red-700 border-[12px] border-black/40 shadow-[0_0_80px_rgba(249,115,22,0.45)] hover:scale-[1.03] active:scale-95 cursor-pointer"
                  : "bg-white/5 text-white/20 border-4 border-white/10 scale-95 shadow-inner cursor-not-allowed"
              }`}
            >
              {/* Radial shiny reflection overlay */}
              {isPlaying && (
                <div className="w-full h-full rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent)] absolute top-0 left-0 pointer-events-none"></div>
              )}
              {/* Inner highlight ring */}
              {isPlaying && (
                <div className="absolute inset-0 rounded-full border border-white/20 scale-95 pointer-events-none"></div>
              )}

              <span className={`font-black tracking-tighter uppercase italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-all ${
                isPlaying ? "text-4xl text-black/40 mix-blend-overlay" : "text-2xl text-white/10"
              }`}>
                BUZZ
              </span>
              <span className={`text-[9px] font-bold tracking-[0.25em] uppercase mt-2 ${
                isPlaying ? "text-white/80" : "text-white/20"
              }`}>
                {isPlaying ? "Appuyez !" : "En pause"}
              </span>
            </button>

            {/* Play/Pause controls if they just want to trigger listening */}
            {!isBuzzed && (
              <button
                id="btn-play-pause"
                onClick={() => {
                  playClickSound();
                  setIsPlaying(!isPlaying);
                }}
                className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-full border border-white/10 transition text-xs font-bold text-slate-200"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 text-orange-500 fill-current" />
                    <span>Mettre en pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-emerald-500 fill-current" />
                    <span>Lancer l'écoute</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* REVEAL SONG DETAILS (ROUND OVER / REVEAL SCREEN) */}
        {isRevealed && (
          <div className="text-center p-6 bg-white/5 border border-white/10 rounded-[32px] max-w-xs w-full shadow-2xl animate-scale-up space-y-4">
            <span className="inline-flex items-center justify-center p-2.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
              <Check className="w-6 h-6 animate-pulse" />
            </span>
            <h4 className="text-xs font-bold text-orange-400 tracking-widest uppercase">
              RÉVÉLATION
            </h4>

            {currentTrack.artworkUrl ? (
              <img
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                referrerPolicy="no-referrer"
                className="w-32 h-32 mx-auto rounded-2xl object-cover shadow-lg border border-white/10 bg-slate-800"
              />
            ) : (
              <div className="w-32 h-32 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                <Music className="w-12 h-12 text-orange-500/40" />
              </div>
            )}

            <div className="space-y-1 px-2">
              <h3 className="font-bold text-lg text-white leading-snug truncate">
                {currentTrack.title}
              </h3>
              <p className="text-slate-400 text-sm font-medium truncate italic">
                {currentTrack.artist}
              </p>
              {currentTrack.album && (
                <p className="text-slate-500 text-[10px] truncate mt-0.5 uppercase tracking-wider">
                  Album : {currentTrack.album}
                </p>
              )}
            </div>

            <div className="bg-black/40 p-2.5 rounded-2xl border border-white/5 flex justify-around text-xs mt-2 font-bold">
              <div className="flex items-center space-x-1.5">
                {artistGuessed ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <X className="w-4 h-4 text-red-500" />
                )}
                <span className={artistGuessed ? "text-emerald-400" : "text-white/30"}>Artiste</span>
              </div>
              <div className="w-[1px] bg-white/5" />
              <div className="flex items-center space-x-1.5">
                {titleGuessed ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <X className="w-4 h-4 text-red-500" />
                )}
                <span className={titleGuessed ? "text-emerald-400" : "text-white/30"}>Titre</span>
              </div>
            </div>

            <button
              id="btn-next-track"
              onClick={handleNextTrack}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-extrabold text-sm shadow-lg shadow-orange-600/20 transition active:scale-95 uppercase tracking-wider"
            >
              {currentIndex + 1 < tracks.length ? "Musique Suivante" : "Voir les Résultats"}
            </button>
          </div>
        )}

        {/* FEEDBACK BANNER (Temporary notifications) */}
        {guessFeedback.show && !isRevealed && !isBuzzed && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-xs z-30 animate-fade-in-down">
            <div className={`p-3 rounded-2xl border text-xs text-center font-bold flex items-center justify-center space-x-2 shadow-lg backdrop-blur-md ${
              guessFeedback.artistOk && guessFeedback.titleOk
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-white/10 border-white/20 text-orange-400"
            }`}>
              <SparkleBadge artist={guessFeedback.artistOk} title={guessFeedback.titleOk} />
              <span>{guessFeedback.text}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. INPUT MODAL WHEN BUZZED */}
      {isBuzzed && (
        <div className="fixed inset-0 bg-[#0a050d]/80 backdrop-blur-xl z-40 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white/5 border border-white/10 p-6 rounded-[32px] shadow-2xl animate-scale-up space-y-4">
            <div className="text-center">
              <span className="inline-block p-2 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 mb-2 animate-bounce">
                🚨
              </span>
              <h3 className="text-lg font-light tracking-widest uppercase">
                BUZZER <span className="font-extrabold text-orange-500">ACTIVÉ !</span>
              </h3>
              <p className="text-white/40 text-xs mt-1 uppercase tracking-widest">
                Musique en pause - Soyez rapide !
              </p>
            </div>

            <form onSubmit={handleSubmitGuess} className="space-y-4">
              {/* Artist Input Field */}
              <div className="relative mt-2">
                <label className="absolute -top-2 left-4 bg-[#0a050d] px-2 text-[9px] uppercase tracking-widest text-orange-400 font-bold z-10">
                  Artiste (+1pt)
                </label>
                {artistGuessed ? (
                  <div className="w-full bg-black/40 border border-emerald-500/30 text-emerald-400 rounded-2xl py-4 px-6 text-base font-bold flex items-center justify-between">
                    <span>{currentTrack.artist}</span>
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                ) : (
                  <input
                    type="text"
                    autoFocus
                    value={artistInput}
                    onChange={(e) => setArtistInput(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-base text-white placeholder-white/25 outline-none focus:border-orange-500/50"
                    placeholder="Entrez l'artiste..."
                  />
                )}
              </div>

              {/* Title Input Field */}
              <div className="relative mt-2">
                <label className="absolute -top-2 left-4 bg-[#0a050d] px-2 text-[9px] uppercase tracking-widest text-orange-400 font-bold z-10">
                  Titre (+1pt)
                </label>
                {titleGuessed ? (
                  <div className="w-full bg-black/40 border border-emerald-500/30 text-emerald-400 rounded-2xl py-4 px-6 text-base font-bold flex items-center justify-between">
                    <span>{currentTrack.title}</span>
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-base text-white placeholder-white/25 outline-none focus:border-orange-500/50"
                    placeholder="Entrez le titre..."
                  />
                )}
              </div>

              {/* Action Buttons inside Buzzer Popup */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsBuzzed(false);
                    setIsPlaying(true); // resume track
                  }}
                  className="py-4 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 text-xs font-bold uppercase tracking-wider transition"
                >
                  Passer / Reprendre
                </button>
                <button
                  type="submit"
                  className="py-4 rounded-2xl bg-orange-600 font-bold uppercase tracking-widest shadow-lg shadow-orange-600/20 text-xs text-white transition active:scale-95"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Footer controls: Quit / Skip */}
      <div className="flex items-center justify-between border-t border-white/5 pt-3 mb-2">
        <button
          id="btn-quit"
          onClick={() => {
            playClickSound();
            if (window.confirm("Êtes-vous sûr de vouloir quitter la partie ?")) {
              onQuit();
            }
          }}
          className="text-xs text-slate-500 hover:text-red-400 font-bold transition p-1"
        >
          Abandonner
        </button>

        {!isRevealed && !isBuzzed && (
          <button
            id="btn-skip-track"
            onClick={handleSkip}
            className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white font-bold transition p-1 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl"
          >
            <span>Donner la langue au chat</span>
            <SkipForward className="w-3.5 h-3.5 text-orange-500" />
          </button>
        )}
      </div>
    </div>
  );
}

// Sparkle badge indicator for partial correct answers
function SparkleBadge({ artist, title }: { artist: boolean; title: boolean }) {
  if (artist && title) return <span className="text-lg">🎉</span>;
  if (artist || title) return <span className="text-lg">⭐</span>;
  return <span className="text-lg">❌</span>;
}
