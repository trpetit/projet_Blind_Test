import React from "react";
import { Music, Radio, Laptop, ArrowRight, Users } from "lucide-react";
import { playClickSound } from "../lib/audioEffects";

interface HomeViewProps {
  onSelectMode: (mode: "LOCAL" | "ONLINE" | "MULTIPLAYER") => void;
}

export default function HomeView({ onSelectMode }: HomeViewProps) {
  const handleSelect = (mode: "LOCAL" | "ONLINE" | "MULTIPLAYER") => {
    playClickSound();
    onSelectMode(mode);
  };

  return (
    <div className="flex flex-col h-full justify-between p-6 text-white bg-transparent relative z-10">
      {/* App Branding Header */}
      <div className="text-center mt-6 animate-fade-in">
        <div className="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
          <Music className="w-8 h-8 animate-pulse" />
        </div>
        <h1 className="text-3xl font-light tracking-widest uppercase text-white">
          BLIND<span className="font-extrabold text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.2)]">TEST</span>
        </h1>
        <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto tracking-wide font-medium">
          Testez votre culture musicale ! Marquez 1 pt pour l'artiste et 1 pt pour le titre.
        </p>
      </div>

      {/* Main Options */}
      <div className="space-y-4 my-8">
        {/* Local MP3 Mode Card */}
        <button
          id="btn-mode-local"
          onClick={() => handleSelect("LOCAL")}
          className="w-full text-left p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-orange-500/40 hover:bg-white/10 transition-all duration-300 group shadow-lg flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100 group-hover:text-orange-400 transition-colors">
                Mode Local (MP3)
              </h3>
              <p className="text-slate-400 text-xs mt-1 mr-4">
                Jouez avec les fichiers MP3 de votre téléphone ou ordinateur.
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
        </button>

        {/* Online Streaming Mode Card */}
        <button
          id="btn-mode-online"
          onClick={() => handleSelect("ONLINE")}
          className="w-full text-left p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-orange-500/40 hover:bg-white/10 transition-all duration-300 group shadow-lg flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100 group-hover:text-orange-400 transition-colors">
                Mode En Ligne
              </h3>
              <p className="text-slate-400 text-xs mt-1 mr-4">
                Playlists Spotify, Deezer ou sélections prêtes à l'emploi.
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
        </button>

        {/* Online Multiplayer Mode Card */}
        <button
          id="btn-mode-multiplayer"
          onClick={() => handleSelect("MULTIPLAYER")}
          className="w-full text-left p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-orange-500/40 hover:bg-white/10 transition-all duration-300 group shadow-[0_0_30px_rgba(249,115,22,0.1)] hover:shadow-[0_0_35px_rgba(249,115,22,0.15)] flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100 group-hover:text-orange-400 transition-colors flex items-center space-x-2">
                <span>Multi-joueurs (Ligne)</span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-full animate-pulse border border-orange-500/20">LIVE</span>
              </h3>
              <p className="text-slate-400 text-xs mt-1 mr-4">
                Créez une salle comme DJ ou rejoignez des amis avec un code.
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
        </button>
      </div>

      {/* Rules & Footer */}
      <div className="rounded-2xl bg-white/5 border border-white/15 p-4 text-center">
        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Règles du jeu</h4>
        <div className="mt-2 text-xs text-slate-300 space-y-1 font-medium">
          <p>⏳ 30 secondes d'écoute par musique.</p>
          <p>🚨 Tapez le <span className="text-orange-500 font-bold">Buzzer</span> pour arrêter la musique et deviner.</p>
          <p>⭐ +1 pt Artiste / +1 pt Titre. Enchaînez les victoires !</p>
        </div>
      </div>
    </div>
  );
}
