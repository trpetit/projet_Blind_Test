import React from "react";
import { Award, RotateCcw, Home, Music, Check, X, Star } from "lucide-react";
import { RoundResult } from "../types";
import { playClickSound } from "../lib/audioEffects";

interface GameOverViewProps {
  score: number;
  totalTracks: number;
  results: RoundResult[];
  onRestart: () => void;
  onGoHome: () => void;
}

export default function GameOverView({ score, totalTracks, results, onRestart, onGoHome }: GameOverViewProps) {
  const totalPossible = totalTracks * 2;
  const percentage = totalPossible > 0 ? (score / totalPossible) * 100 : 0;

  // Grade and Title based on percentage
  const getPerformanceFeedback = () => {
    if (percentage >= 90) return { title: "Légende Absolue ! 👑", text: "Vous avez une oreille absolue et une culture musicale digne des plus grands !" };
    if (percentage >= 70) return { title: "Virtuose ! 🎵", text: "Excellent score ! Très peu de titres ou d'artistes vous résistent." };
    if (percentage >= 50) return { title: "Mélomane ! ⭐", text: "C'est un bon score ! Votre culture musicale est solide." };
    if (percentage >= 30) return { title: "Amateur Éclairé 🎧", text: "Pas mal, mais vous pouvez faire mieux ! Recommencez pour vous améliorer." };
    return { title: "Novice 🐣", text: "C'est un début ! Entraînez-vous encore pour devenir un pro du blind test." };
  };

  const feedback = getPerformanceFeedback();

  return (
    <div className="flex flex-col h-full bg-transparent text-white p-6 justify-between overflow-y-auto relative z-10">
      {/* 1. Header Trophy Section */}
      <div className="text-center mt-4 animate-scale-up">
        <div className="inline-flex items-center justify-center p-4 mb-4 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
          <Award className="w-12 h-12 animate-bounce text-orange-500" />
        </div>
        <h2 className="text-2xl font-light tracking-widest uppercase">
          Partie <span className="font-extrabold text-orange-500">Terminée !</span>
        </h2>
        
        {/* Score display card */}
        <div className="mt-4 inline-block bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-2xl">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Votre Score</div>
          <div className="text-4xl font-black text-orange-500 mt-1">
            {score} <span className="text-sm font-bold text-white/30">/ {totalPossible} pts</span>
          </div>
          <div className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
            {results.length} musiques écoutées
          </div>
        </div>

        {/* Dynamic review feedback */}
        <div className="mt-4 max-w-xs mx-auto">
          <h4 className="font-bold text-xs text-orange-400 uppercase tracking-wider">{feedback.title}</h4>
          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
            {feedback.text}
          </p>
        </div>
      </div>

      {/* 2. Tracklist Summary Details */}
      <div className="my-6 space-y-3">
        <h3 className="text-[10px] font-bold tracking-widest text-orange-400 uppercase px-1">
          Détail des morceaux
        </h3>
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {results.map((res, index) => (
            <div
              key={index}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3 min-w-0">
                {res.track.artworkUrl ? (
                  <img
                    src={res.track.artworkUrl}
                    alt={res.track.title}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-lg object-cover shrink-0 bg-slate-800"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-slate-650 shrink-0">
                    <Music className="w-5 h-5 text-orange-500/50" />
                  </div>
                )}
                <div className="min-w-0 text-left">
                  <h4 className="font-bold text-xs text-slate-200 truncate pr-2">{res.track.title}</h4>
                  <p className="text-[10px] text-slate-400 truncate pr-2 mt-0.5 italic">{res.track.artist}</p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center space-x-2 shrink-0">
                {/* Artist Guess Badge */}
                <span
                  title={res.artistCorrect ? "Artiste correct" : "Artiste manqué"}
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                    res.artistCorrect ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  A
                </span>

                {/* Title Guess Badge */}
                <span
                  title={res.titleCorrect ? "Titre correct" : "Titre manqué"}
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                    res.titleCorrect ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  T
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Replay Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5 mt-auto">
        <button
          id="btn-restart-game"
          onClick={() => {
            playClickSound();
            onRestart();
          }}
          className="py-3.5 bg-white/5 hover:bg-white/10 text-orange-500 rounded-2xl font-bold text-xs border border-white/10 flex items-center justify-center space-x-2 transition active:scale-95 uppercase tracking-wider"
        >
          <RotateCcw className="w-4 h-4 text-orange-500" />
          <span>Recommencer</span>
        </button>

        <button
          id="btn-gohome"
          onClick={() => {
            playClickSound();
            onGoHome();
          }}
          className="py-3.5 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-bold text-xs shadow-lg shadow-orange-600/20 flex items-center justify-center space-x-2 transition active:scale-95 uppercase tracking-wider"
        >
          <Home className="w-4 h-4 text-white" />
          <span>Accueil</span>
        </button>
      </div>
    </div>
  );
}
