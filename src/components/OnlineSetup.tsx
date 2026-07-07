import React, { useState, useEffect } from "react";
import { ArrowLeft, Search, Music, Sparkles, AlertCircle, RefreshCw, Link2, Play } from "lucide-react";
import { PlaylistInfo, Track } from "../types";
import { playClickSound } from "../lib/audioEffects";

interface OnlineSetupProps {
  onBack: () => void;
  onStartGame: (tracks: Track[], playlistName: string) => void;
}

// Built-in presets (using highly reliable public Deezer playlist IDs)
const PRESETS: PlaylistInfo[] = [
  {
    id: "1131713501",
    name: "Hits Années 80",
    description: "Les plus grands hits des années 80 : Madonna, Michael Jackson, Queen...",
    artworkUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=200&auto=format&fit=crop",
    trackCount: 50,
    source: "DEEZER",
  },
  {
    id: "1282495565",
    name: "Pop Pop Pop",
    description: "Les indispensables de la pop mondiale moderne : Dua Lipa, The Weeknd, Taylor Swift...",
    artworkUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop",
    trackCount: 50,
    source: "DEEZER",
  },
  {
    id: "1326462445",
    name: "Disney Classics",
    description: "Retrouvez les refrains légendaires de votre enfance : Le Roi Lion, Aladin, La Reine des Neiges...",
    artworkUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=200&auto=format&fit=crop",
    trackCount: 40,
    source: "DEEZER",
  },
  {
    id: "1150033",
    name: "Musiques de Films",
    description: "BO Cultes et bandes originales : Star Wars, Gladiator, Interstellar, Harry Potter...",
    artworkUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=200&auto=format&fit=crop",
    trackCount: 45,
    source: "DEEZER",
  },
];

export default function OnlineSetup({ onBack, onStartGame }: OnlineSetupProps) {
  const [source, setSource] = useState<"DEEZER" | "SPOTIFY">("DEEZER");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaylistInfo[]>([]);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [configStatus, setConfigStatus] = useState({ spotifyConfigured: false });

  // Check backend Spotify configuration on mount
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setConfigStatus(data);
        if (!data.spotifyConfigured) {
          setSource("DEEZER"); // Safe fallback
        }
      })
      .catch((err) => console.error("Error loading config:", err));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    playClickSound();
    setIsSearching(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/playlists/search?q=${encodeURIComponent(searchQuery)}&source=${source}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Une erreur s'est produite lors de la recherche.");
      }

      setSearchResults(data.playlists || []);
      if ((data.playlists || []).length === 0) {
        setErrorMessage("Aucune playlist trouvée pour cette recherche.");
      }
    } catch (err: any) {
      setErrorMessage(err.message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const loadPlaylistTracks = async (playlistId: string, playlistSource: "DEEZER" | "SPOTIFY" | "PRESET", customName?: string) => {
    playClickSound();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const cleanSource = playlistSource === "PRESET" ? "DEEZER" : playlistSource;
      const response = await fetch(`/api/playlists/${cleanSource}/${playlistId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de récupérer les chansons.");
      }

      const tracks: Track[] = data.tracks || [];

      if (tracks.length === 0) {
        throw new Error("Cette playlist ne contient aucun morceau jouable.");
      }

      // Shuffle tracks for gameplay variety
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);

      onStartGame(shuffled, customName || "Playlist En Ligne");
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistUrl.trim()) return;

    playClickSound();
    setErrorMessage("");

    // Detect Spotify Playlist URL
    // Format: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGg6M6gy?si=...
    const spotifyRegex = /spotify\.com\/playlist\/([a-zA-Z0-9]+)/i;
    const spotifyMatch = playlistUrl.match(spotifyRegex);

    // Detect Deezer Playlist URL
    // Format: https://www.deezer.com/fr/playlist/1131713501
    const deezerRegex = /deezer\.com(?:\/[a-z]{2})?\/playlist\/([0-9]+)/i;
    const deezerMatch = playlistUrl.match(deezerRegex);

    if (spotifyMatch) {
      if (!configStatus.spotifyConfigured) {
        setErrorMessage("Le mode Spotify nécessite de configurer vos clés API dans le fichier .env.");
        return;
      }
      loadPlaylistTracks(spotifyMatch[1], "SPOTIFY", "Playlist Spotify URL");
    } else if (deezerMatch) {
      loadPlaylistTracks(deezerMatch[1], "DEEZER", "Playlist Deezer URL");
    } else {
      // Treat as plain ID based on current source
      const cleanId = playlistUrl.trim().replace(/\D/g, ""); // Keep only numbers for Deezer if digits
      if (cleanId) {
        loadPlaylistTracks(cleanId, source, `Playlist #${cleanId}`);
      } else {
        setErrorMessage("Lien invalide. Veuillez coller un lien complet de playlist Spotify ou Deezer.");
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-white p-6 justify-between overflow-y-auto relative z-10">
      <div>
        {/* Navigation Header */}
        <button
          id="btn-online-back"
          onClick={() => {
            playClickSound();
            onBack();
          }}
          className="inline-flex items-center text-slate-400 hover:text-white mb-6 space-x-1"
        >
          <ArrowLeft className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium tracking-wide">Retour</span>
        </button>

        <h2 className="text-2xl font-light tracking-widest uppercase flex items-center space-x-2">
          <Sparkles className="w-6 h-6 text-orange-500" />
          <span>MODE EN <span className="font-extrabold text-orange-500">LIGNE</span></span>
        </h2>
        <p className="text-slate-400 text-xs mt-1 mb-6">
          Jouez instantanément avec des playlists de streaming. Les morceaux durent 30 secondes d'extrait.
        </p>

        {/* Source Switcher */}
        {configStatus.spotifyConfigured && (
          <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl mb-6">
            <button
              onClick={() => {
                playClickSound();
                setSource("DEEZER");
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                source === "DEEZER" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/10" : "text-slate-400 hover:text-white"
              }`}
            >
              Deezer (Sans clés API)
            </button>
            <button
              onClick={() => {
                playClickSound();
                setSource("SPOTIFY");
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                source === "SPOTIFY" ? "bg-green-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Spotify (Configuré)
            </button>
          </div>
        )}

        {/* Info panel when Spotify keys are missing and they search on Deezer */}
        {!configStatus.spotifyConfigured && (
          <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl mb-6 text-xs text-orange-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-orange-500" />
            <div>
              <span className="font-semibold">Recherche publique active :</span> Vous jouez actuellement avec la plateforme <span className="font-bold underline text-white">Deezer</span>. Aucune clé API ou compte n'est requis ! Tout est prêt.
            </div>
          </div>
        )}

        {/* Error message block */}
        {errorMessage && (
          <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-xs mb-6 flex items-start space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Preset Playlists Grid */}
        <div className="space-y-3 mb-6">
          <h3 className="text-[10px] font-bold tracking-widest text-orange-400 uppercase px-1">
            Playlists Célèbres
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => loadPlaylistTracks(preset.id, preset.source, preset.name)}
                disabled={isLoading}
                className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-orange-500/40 text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-[120px] group relative overflow-hidden"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-10 group-hover:scale-110 transition-transform duration-500"
                  style={{ backgroundImage: `url(${preset.artworkUrl})` }}
                />
                <div className="relative z-10">
                  <h4 className="font-bold text-xs text-slate-200 line-clamp-1 group-hover:text-orange-400 transition-colors">
                    {preset.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 line-clamp-2 mt-1">
                    {preset.description}
                  </p>
                </div>
                <div className="relative z-10 flex items-center justify-between mt-2 pt-2 border-t border-white/5 w-full text-[9px] text-slate-400">
                  <span className="uppercase font-semibold text-orange-400">{preset.source}</span>
                  <span>~{preset.trackCount} titres</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Search Input Box */}
        <div className="space-y-3 mb-6">
          <h3 className="text-[10px] font-bold tracking-widest text-orange-400 uppercase px-1">
            Rechercher une playlist
          </h3>
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ex: Rock Français, Disney, Rap US, Années 90..."
              className="w-full bg-black/40 border border-white/10 focus:border-orange-500/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-2 top-2 px-3 py-1 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition"
            >
              {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Rechercher"}
            </button>
          </form>
        </div>

        {/* URL Input Box */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold tracking-widest text-orange-400 uppercase px-1">
            Charger par URL de playlist
          </h3>
          <form onSubmit={handleUrlSubmit} className="relative">
            <input
              type="text"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="Coller un lien Spotify ou Deezer..."
              className="w-full bg-black/40 border border-white/10 focus:border-orange-500/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none"
            />
            <Link2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <button
              type="submit"
              disabled={isLoading || !playlistUrl.trim()}
              className="absolute right-2 top-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition"
            >
              Ok
            </button>
          </form>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-[10px] font-bold tracking-widest text-orange-400 px-1 uppercase">Résultats de la recherche</h4>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadPlaylistTracks(item.id, item.source, item.name)}
                  disabled={isLoading}
                  className="w-full p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:border-orange-500/40 text-left transition flex items-center justify-between animate-fade-in"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={item.artworkUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-lg object-cover bg-slate-800"
                    />
                    <div className="min-w-0">
                      <h5 className="font-bold text-xs text-slate-200 truncate pr-2">{item.name}</h5>
                      <p className="text-[10px] text-slate-500 truncate pr-2 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full shrink-0">
                    {item.trackCount} t
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Global loading screen overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-[#0a050d]/80 backdrop-blur-xl z-50 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center p-6 bg-white/5 border border-white/10 rounded-3xl shadow-2xl max-w-xs text-center space-y-4 flex-col">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
              <Music className="w-5 h-5 text-orange-500 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-200">Chargement de la playlist...</h4>
              <p className="text-[10px] text-slate-500 mt-1">
                Nous récupérons les pistes et préparons les extraits sonores.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
