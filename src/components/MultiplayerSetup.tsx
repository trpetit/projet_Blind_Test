import React, { useState, useEffect } from "react";
import { ArrowLeft, Radio, Users, Sparkles, AlertCircle, RefreshCw, Play, Search, Link2, Copy, Check } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { playClickSound } from "../lib/audioEffects";

interface MultiplayerSetupProps {
  onBack: () => void;
  onStartMultiplayerGame: (socket: Socket, roomState: any, isHost: boolean, playerName: string) => void;
}

interface PlaylistInfo {
  id: string;
  name: string;
  description: string;
  artworkUrl: string;
  trackCount: number;
  source: "DEEZER" | "SPOTIFY" | "PRESET";
}

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
    description: "Retrouvez les refrains légendaires de votre enfance : Le Roi Lion, Aladin...",
    artworkUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=200&auto=format&fit=crop",
    trackCount: 40,
    source: "DEEZER",
  },
  {
    id: "1150033",
    name: "Musiques de Films",
    description: "BO Cultes et bandes originales : Star Wars, Gladiator, Interstellar...",
    artworkUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=200&auto=format&fit=crop",
    trackCount: 45,
    source: "DEEZER",
  },
];

export default function MultiplayerSetup({ onBack, onStartMultiplayerGame }: MultiplayerSetupProps) {
  const [step, setStep] = useState<"CHOICE" | "CREATE_FORM" | "JOIN_FORM" | "LOBBY">("CHOICE");
  const [playerName, setPlayerName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<any>(null);
  const [isHost, setIsHost] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Playlist searching (for Host)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaylistInfo[]>([]);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);



  const initSocket = () => {
    if (socket) return socket;
    
    // Connect to the same port on the host
    const s = io();
    
    s.on("connect_error", () => {
      setErrorMessage("Erreur de connexion au serveur de jeu.");
      setIsLoading(false);
    });

    s.on("error_msg", (msg: string) => {
      setErrorMessage(msg);
      setIsLoading(false);
    });

    s.on("room_created", ({ roomCode }) => {
      setIsHost(true);
      setStep("LOBBY");
      setIsLoading(false);
    });

    s.on("room_state", (state) => {
      setRoomState(state);
      setIsLoading(false);
      
      // If the game started (has tracks and state is active)
      if (state && state.totalTracks > 0 && state.isStarted) {
        // Automatically start game screen
        onStartMultiplayerGame(s, state, s.id === state.hostId, playerName);
      }
    });

    s.on("player_joined", ({ player }) => {
      // Simple play click on join
      playClickSound();
    });

    setSocket(s);
    return s;
  };

  const handleCreateRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    playClickSound();
    setIsLoading(true);
    setErrorMessage("");

    const s = initSocket();
    s.emit("create_room", { playerName: playerName.trim() });
  };

  const handleJoinRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomCodeInput.trim()) return;

    playClickSound();
    setIsLoading(true);
    setErrorMessage("");

    const s = initSocket();
    s.emit("join_room", {
      roomCode: roomCodeInput.trim().toUpperCase(),
      playerName: playerName.trim(),
    });
    setStep("LOBBY");
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    playClickSound();
    setIsSearching(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/playlists/search?q=${encodeURIComponent(searchQuery)}&source=DEEZER`);
      const data = await response.json();
      setSearchResults(data.playlists || []);
    } catch (err: any) {
      setErrorMessage("Échec de la recherche.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlaylist = (playlistId: string, playlistName: string) => {
    if (!socket || !roomState) return;
    playClickSound();
    setIsLoading(true);

    socket.emit("select_playlist", {
      roomCode: roomState.code,
      playlistId,
      playlistSource: "DEEZER",
      playlistName,
    });
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistUrl.trim() || !socket || !roomState) return;

    playClickSound();
    setErrorMessage("");

    const deezerRegex = /deezer\.com(?:\/[a-z]{2})?\/playlist\/([0-9]+)/i;
    const deezerMatch = playlistUrl.match(deezerRegex);

    if (deezerMatch) {
      handleSelectPlaylist(deezerMatch[1], "Playlist Deezer");
    } else {
      const cleanId = playlistUrl.trim().replace(/\D/g, "");
      if (cleanId) {
        handleSelectPlaylist(cleanId, `Playlist #${cleanId}`);
      } else {
        setErrorMessage("Lien invalide. Collez un lien de playlist Deezer.");
      }
    }
  };

  const handleStartGame = () => {
    if (!socket || !roomState) return;
    playClickSound();
    socket.emit("start_game", { roomCode: roomState.code });
  };

  const copyCode = () => {
    if (!roomState) return;
    playClickSound();
    navigator.clipboard.writeText(roomState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = () => {
    playClickSound();
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setRoomState(null);
    setIsHost(false);
    setStep("CHOICE");
    setErrorMessage("");
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-white p-6 justify-between overflow-y-auto relative z-10">
      <div>
        {/* Navigation Header */}
        <button
          onClick={() => {
            playClickSound();
            if (step === "CHOICE") {
              onBack();
            } else if (step === "LOBBY") {
              handleCancel();
            } else {
              setStep("CHOICE");
            }
          }}
          className="inline-flex items-center text-slate-400 hover:text-white mb-6 space-x-1"
        >
          <ArrowLeft className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium tracking-wide">Retour</span>
        </button>

        <h2 className="text-2xl font-light tracking-widest uppercase flex items-center space-x-2">
          <Users className="w-6 h-6 text-orange-500" />
          <span>MULTI<span className="font-extrabold text-orange-500">JOUEURS</span></span>
        </h2>
        <p className="text-slate-400 text-xs mt-1 mb-6">
          Jouez en temps réel ! Le DJ lance la musique, tout le monde buzze sur son écran.
        </p>

        {errorMessage && (
          <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-xs mb-6 flex items-start space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: CHOICE */}
        {step === "CHOICE" && (
          <div className="space-y-4 my-8">
            <button
              onClick={() => {
                playClickSound();
                setStep("CREATE_FORM");
              }}
              className="w-full text-left p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-orange-500/40 hover:bg-white/10 transition-all duration-300 group flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <Radio className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100 group-hover:text-orange-400 transition-colors">
                    Créer un Salon (Être DJ)
                  </h3>
                  <p className="text-slate-400 text-[11px] mt-1 pr-4">
                    Gérez la playlist et lancez les morceaux pour tout le monde.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setStep("JOIN_FORM");
              }}
              className="w-full text-left p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-orange-500/40 hover:bg-white/10 transition-all duration-300 group flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100 group-hover:text-orange-400 transition-colors">
                    Rejoindre un Salon
                  </h3>
                  <p className="text-slate-400 text-[11px] mt-1 pr-4">
                    Entrez un code de salon pour jouer contre vos amis.
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* STEP 2A: CREATE FORM */}
        {step === "CREATE_FORM" && (
          <form onSubmit={handleCreateRoomSubmit} className="space-y-4 my-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Votre Pseudo DJ
              </label>
              <input
                type="text"
                required
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={15}
                placeholder="Ex: DJ Star"
                className="w-full bg-black/40 border border-white/10 focus:border-orange-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !playerName.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? "Création du salon..." : "Créer le Salon"}
            </button>
          </form>
        )}

        {/* STEP 2B: JOIN FORM */}
        {step === "JOIN_FORM" && (
          <form onSubmit={handleJoinRoomSubmit} className="space-y-4 my-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Code du Salon (4 lettres)
              </label>
              <input
                type="text"
                required
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={4}
                placeholder="Ex: ABCD"
                className="w-full bg-black/40 border border-white/10 focus:border-orange-500/50 rounded-xl px-4 py-3 text-sm text-center font-black tracking-widest text-orange-400 outline-none uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Votre Pseudo
              </label>
              <input
                type="text"
                required
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={15}
                placeholder="Ex: Music Lover"
                className="w-full bg-black/40 border border-white/10 focus:border-orange-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !playerName.trim() || roomCodeInput.length !== 4}
              className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? "Connexion..." : "Rejoindre la partie"}
            </button>
          </form>
        )}

        {/* STEP 3: LOBBY */}
        {step === "LOBBY" && roomState && (
          <div className="space-y-6">
            {/* Room Code Display */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Code de la Partie</span>
                <div className="text-3xl font-black text-orange-500 tracking-wider mt-1 uppercase">{roomState.code}</div>
              </div>
              <button
                onClick={copyCode}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition flex items-center space-x-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-400 font-bold">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="text-xs font-medium">Copier</span>
                  </>
                )}
              </button>
            </div>

            {/* Players List */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold tracking-widest text-orange-400 uppercase px-1">
                Joueurs Connectés ({roomState.players?.length || 0})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {roomState.players?.map((p: any) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center space-x-2 truncate"
                  >
                    <div className={`w-2 h-2 rounded-full ${p.isHost ? "bg-orange-500" : "bg-green-500"}`} />
                    <div className="truncate text-xs font-bold text-slate-200">
                      {p.name} {p.isHost && <span className="text-[9px] text-orange-500 font-bold ml-1 uppercase">(DJ)</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Playlist Status */}
            <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 space-y-2">
              <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest block">Playlist Active</span>
              <h4 className="font-extrabold text-sm text-slate-200">{roomState.playlistName}</h4>
              <p className="text-[10px] text-slate-400">
                {roomState.totalTracks > 0
                  ? `🎮 Prêt ! ${roomState.totalTracks} morceaux chargés.`
                  : "⏳ En attente de la sélection de la playlist..."}
              </p>
            </div>

            {/* DJ ACTIONS: SELECT PLAYLIST & START GAME */}
            {isHost && (
              <div className="space-y-6 pt-2">
                {!roomState.totalTracks ? (
                  <div className="space-y-4">
                    {/* Presets Selection */}
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-bold tracking-widest text-orange-400 uppercase">
                        SÉLECTION RAPIDE
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => handleSelectPlaylist(preset.id, preset.name)}
                            className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-orange-500/30 text-left transition flex flex-col justify-between h-[80px]"
                          >
                            <h5 className="font-extrabold text-[11px] text-slate-200 line-clamp-1">
                              {preset.name}
                            </h5>
                            <span className="text-[9px] text-orange-400 font-bold uppercase">{preset.trackCount} titres</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Search box for DJ */}
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-bold tracking-widest text-orange-400 uppercase">
                        RECHERCHER UNE PLAYLIST (DEEZER)
                      </h3>
                      <form onSubmit={handleSearch} className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Rechercher..."
                          className="w-full bg-black/40 border border-white/10 focus:border-orange-500/50 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                        <button
                          type="submit"
                          className="absolute right-2 top-1.5 px-2.5 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-[10px] font-bold uppercase"
                        >
                          Ok
                        </button>
                      </form>
                    </div>

                    {/* Search results list */}
                    {searchResults.length > 0 && (
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {searchResults.slice(0, 5).map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleSelectPlaylist(item.id, item.name)}
                            className="w-full p-2 rounded-xl bg-white/5 border border-white/10 hover:border-orange-500/30 text-left transition flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <img
                                src={item.artworkUrl}
                                alt={item.name}
                                className="w-8 h-8 rounded object-cover"
                              />
                              <span className="font-bold text-xs text-slate-200 truncate">{item.name}</span>
                            </div>
                            <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                              {item.trackCount}t
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleStartGame}
                    className="w-full py-4 rounded-2xl font-bold bg-gradient-to-r from-orange-600 to-red-700 text-white shadow-[0_0_30px_rgba(249,115,22,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2 uppercase tracking-widest text-xs"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Lancer le Blind Test !</span>
                  </button>
                )}
              </div>
            )}

            {!isHost && !roomState.totalTracks && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center text-slate-400 text-xs animate-pulse">
                Le DJ est en train de choisir la playlist...
              </div>
            )}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-[#0a050d]/80 backdrop-blur-md z-50 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-3" />
          <span className="text-xs text-slate-300 font-bold">Synchronisation en cours...</span>
        </div>
      )}
    </div>
  );
}
