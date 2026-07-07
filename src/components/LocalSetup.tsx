import React, { useState, useRef } from "react";
import { Upload, ArrowLeft, Play, Music, Trash2, Edit2, Check } from "lucide-react";
import { Track } from "../types";
import { playClickSound } from "../lib/audioEffects";

interface LocalSetupProps {
  onBack: () => void;
  onStartGame: (tracks: Track[]) => void;
}

export default function LocalSetup({ onBack, onStartGame }: LocalSetupProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse file name into Artist and Title
  // Example: "Daft Punk - One More Time.mp3" -> Artist: "Daft Punk", Title: "One More Time"
  const parseFileName = (fileName: string): { artist: string; title: string } => {
    // Remove extension
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    
    // Try to split by common separators
    const separators = [" - ", " _ ", " -", "- ", "-", "_", "–"];
    for (const sep of separators) {
      const parts = baseName.split(sep);
      if (parts.length >= 2) {
        const artist = parts[0].trim();
        const title = parts.slice(1).join(sep).trim();
        return { artist, title };
      }
    }
    
    // If no separator, use the whole name as title
    return { artist: "", title: baseName.trim() };
  };

  const handleFiles = (files: FileList) => {
    const newTracks: Track[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("audio/")) {
        const { artist, title } = parseFileName(file.name);
        newTracks.push({
          id: `local-${Date.now()}-${i}`,
          title: title || "Titre inconnu",
          artist: artist || "Artiste inconnu",
          previewUrl: URL.createObjectURL(file), // Local blob URL to play directly
          isLocal: true,
        });
      }
    }
    setTracks((prev) => [...prev, ...newTracks]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeTrack = (index: number) => {
    playClickSound();
    setTracks((prev) => {
      const updated = [...prev];
      // Revoke the object URL to save memory
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const updateTrackField = (index: number, field: "artist" | "title", value: string) => {
    setTracks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const triggerStartGame = () => {
    playClickSound();
    if (tracks.length === 0) return;
    onStartGame(tracks);
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-white p-6 justify-between overflow-y-auto relative z-10">
      <div>
        {/* Navigation header */}
        <button
          id="btn-local-back"
          onClick={() => {
            playClickSound();
            onBack();
          }}
          className="inline-flex items-center text-slate-400 hover:text-white mb-6 space-x-1"
        >
          <ArrowLeft className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium tracking-wide">Retour</span>
        </button>

        <h2 className="text-2xl font-light tracking-widest uppercase">Importez vos <span className="font-extrabold text-orange-500">MP3</span></h2>
        <p className="text-slate-400 text-xs mt-1 mb-6">
          Glissez-déposez des chansons. Modifiez ensuite l'artiste et le titre si nécessaire pour que le blind test fonctionne correctement.
        </p>

        {/* File Drag/Drop Area */}
        <div
          id="drag-drop-zone"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
            dragActive
              ? "border-orange-500 bg-orange-500/10 scale-[0.99]"
              : "border-white/10 hover:border-white/20 bg-white/5"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="w-10 h-10 text-orange-500 mb-3 animate-bounce" />
          <p className="text-sm font-medium text-slate-200 text-center">
            Sélectionnez ou Glissez vos fichiers MP3
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Fichiers audio pris en charge (mp3, m4a, wav...)
          </p>
        </div>

        {/* Tracks List */}
        {tracks.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold px-2">
              <span className="tracking-widest uppercase text-[10px] text-orange-400">LISTE DES MORCEAUX ({tracks.length})</span>
              <button
                onClick={() => {
                  playClickSound();
                  tracks.forEach(t => URL.revokeObjectURL(t.previewUrl));
                  setTracks([]);
                }}
                className="text-red-400 hover:text-red-300 text-xs font-semibold"
              >
                Tout effacer
              </button>
            </div>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {tracks.map((track, index) => (
                <div
                  key={track.id}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 relative group"
                >
                  <button
                    onClick={() => removeTrack(index)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-red-400 p-1"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center space-x-2 text-slate-400">
                    <Music className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="text-xs font-bold tracking-wider text-orange-400">Piste #{index + 1}</span>
                  </div>

                  {/* Edit Inputs */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Artiste à deviner
                      </label>
                      <input
                        type="text"
                        value={track.artist}
                        onChange={(e) => updateTrackField(index, "artist", e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-orange-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none mt-1"
                        placeholder="Ex: Daft Punk"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Titre à deviner
                      </label>
                      <input
                        type="text"
                        value={track.title}
                        onChange={(e) => updateTrackField(index, "title", e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-orange-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none mt-1"
                        placeholder="Ex: One More Time"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Start Button */}
      <div className="mt-8 pt-4 border-t border-white/5">
        <button
          id="btn-local-start"
          disabled={tracks.length === 0}
          onClick={triggerStartGame}
          className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all ${
            tracks.length > 0
              ? "bg-gradient-to-br from-orange-600 to-red-700 text-white shadow-[0_0_40px_rgba(249,115,22,0.3)] hover:scale-[1.02] active:scale-95 uppercase tracking-widest text-sm"
              : "bg-white/5 text-white/20 border border-white/10 cursor-not-allowed"
          }`}
        >
          <Play className="w-5 h-5 fill-current text-white" />
          <span>Lancer la Partie ({tracks.length} {tracks.length > 1 ? "morceaux" : "morceau"})</span>
        </button>
      </div>
    </div>
  );
}
