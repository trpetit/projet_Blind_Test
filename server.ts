import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

import { createServer } from "http";
import { Server } from "socket.io";
import { compareTexts } from "./src/lib/textMatcher";

dotenv.config();

const app = express();
const PORT = 3000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(express.json());

// Memory store for Spotify credentials status
let spotifyAccessToken = "";
let spotifyTokenExpiry = 0;

async function getSpotifyAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_KEYS_MISSING");
  }

  if (spotifyAccessToken && Date.now() < spotifyTokenExpiry) {
    return spotifyAccessToken;
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authHeader}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Spotify Token Error:", errorText);
    throw new Error("SPOTIFY_AUTH_FAILED");
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  spotifyAccessToken = data.access_token;
  // Expire 60 seconds early to prevent edge cases
  spotifyTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return spotifyAccessToken;
}

// 1. Health check & Config status
app.get("/api/config", (req, res) => {
  const hasSpotify = !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
  res.json({
    spotifyConfigured: hasSpotify,
    status: "ok",
  });
});

// 2. Playlists Search Endpoint (Combines Spotify if configured, or falls back to Deezer)
app.get("/api/playlists/search", async (req, res) => {
  const query = (req.query.q as string) || "";
  const source = (req.query.source as string) || "DEEZER"; // Default to Deezer for hassle-free access

  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  try {
    if (source === "SPOTIFY") {
      try {
        const token = await getSpotifyAccessToken();
        const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=15`;
        const response = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Spotify API error");
        const data = (await response.json()) as any;
        
        const playlists = (data.playlists?.items || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description || "",
          artworkUrl: item.images?.[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop",
          trackCount: item.tracks?.total || 0,
          source: "SPOTIFY",
        }));

        return res.json({ playlists });
      } catch (err: any) {
        if (err.message === "SPOTIFY_KEYS_MISSING") {
          return res.status(400).json({ error: "Keys Spotify manquantes. Veuillez configurer SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET." });
        }
        throw err;
      }
    } else {
      // Deezer API Playlist Search (No keys needed!)
      const searchUrl = `https://api.deezer.com/search/playlist?q=${encodeURIComponent(query)}&limit=15`;
      const response = await fetch(searchUrl);
      if (!response.ok) throw new Error("Deezer API error");
      const data = (await response.json()) as any;

      const playlists = (data.data || []).map((item: any) => ({
        id: item.id.toString(),
        name: item.title,
        description: `Créé par ${item.user?.name || "Deezer"}`,
        artworkUrl: item.picture_medium || item.picture || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop",
        trackCount: item.nb_tracks || 0,
        source: "DEEZER",
      }));

      return res.json({ playlists });
    }
  } catch (error: any) {
    console.error("Playlist Search Error:", error);
    res.status(500).json({ error: "Erreur lors de la recherche des playlists : " + error.message });
  }
});

// 3. Get Playlist Tracks Endpoint
app.get("/api/playlists/:source/:id", async (req, res) => {
  const { source, id } = req.params;

  try {
    if (source === "SPOTIFY") {
      const token = await getSpotifyAccessToken();
      const response = await fetch(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Impossible de récupérer la playlist Spotify.");
      }

      const data = (await response.json()) as any;
      const tracks = (data.items || [])
        .filter((item: any) => item.track)
        .map((item: any) => {
          const t = item.track;
          return {
            id: t.id,
            title: t.name,
            artist: t.artists?.map((a: any) => a.name).join(", ") || "Artiste inconnu",
            previewUrl: t.preview_url || "", // Spotify sometimes returns null here, client will use fallback
            artworkUrl: t.album?.images?.[0]?.url || "",
            album: t.album?.name || "",
            isLocal: false,
          };
        });

      return res.json({ tracks });
    } else if (source === "DEEZER") {
      const response = await fetch(`https://api.deezer.com/playlist/${id}`);
      if (!response.ok) {
        throw new Error("Impossible de récupérer la playlist Deezer.");
      }

      const data = (await response.json()) as any;
      const tracks = (data.tracks?.data || []).map((t: any) => ({
        id: t.id.toString(),
        title: t.title,
        artist: t.artist?.name || "Artiste inconnu",
        previewUrl: t.preview || "", // Deezer provides beautiful 30s audio previews for almost all songs
        artworkUrl: t.album?.cover_medium || "",
        album: t.album?.title || "",
        isLocal: false,
      }));

      return res.json({ tracks });
    } else {
      return res.status(400).json({ error: "Source de playlist invalide." });
    }
  } catch (error: any) {
    console.error("Get Playlist Tracks Error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération de la playlist : " + error.message });
  }
});

// 4. Fallback search on iTunes API to retrieve a 30s MP3 preview URL on-demand
app.get("/api/tracks/preview", async (req, res) => {
  const artist = (req.query.artist as string) || "";
  const title = (req.query.title as string) || "";

  if (!artist && !title) {
    return res.status(400).json({ error: "Artist or Title is required" });
  }

  try {
    const searchTerm = `${artist} ${title}`;
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=3`;
    const response = await fetch(searchUrl);

    if (!response.ok) throw new Error("iTunes API connection failed");
    const data = (await response.json()) as any;

    if (data.results && data.results.length > 0) {
      // Find the best match
      const match = data.results[0];
      return res.json({
        previewUrl: match.previewUrl || "",
        artworkUrl: match.artworkUrl100 || "",
        title: match.trackName,
        artist: match.artistName,
        success: true,
      });
    }

    res.json({ success: false, message: "Aucun aperçu trouvé sur iTunes." });
  } catch (error: any) {
    console.error("iTunes Preview Fallback Error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  // Integrate Vite middleware in development or serve static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// ==========================================
// MULTIPLAYER MANAGEMENT (SOCKET.IO)
// ==========================================

interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
}

interface Room {
  code: string;
  hostId: string;
  playlistName: string;
  tracks: any[];
  currentIndex: number;
  isPlaying: boolean;
  isRevealed: boolean;
  isBuzzed: boolean;
  buzzedPlayerId: string | null;
  buzzedPlayerName: string | null;
  timeRemaining: number;
  players: { [socketId: string]: Player };
  artistGuessedThisRound: boolean;
  titleGuessedThisRound: boolean;
}

const rooms: { [code: string]: Room } = {};
const roomIntervals: { [code: string]: NodeJS.Timeout } = {};

function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getCleanRoomState(roomCode: string) {
  const room = rooms[roomCode];
  if (!room) return null;

  const playersArray = Object.values(room.players).map(p => ({
    id: p.id,
    name: p.name,
    score: p.score,
    isHost: p.isHost
  }));

  const currentTrack = room.tracks[room.currentIndex];
  
  return {
    code: room.code,
    hostId: room.hostId,
    playlistName: room.playlistName,
    currentIndex: room.currentIndex,
    totalTracks: room.tracks.length,
    isPlaying: room.isPlaying,
    isRevealed: room.isRevealed,
    isBuzzed: room.isBuzzed,
    buzzedPlayerId: room.buzzedPlayerId,
    buzzedPlayerName: room.buzzedPlayerName,
    timeRemaining: room.timeRemaining,
    players: playersArray,
    artistGuessedThisRound: room.artistGuessedThisRound,
    titleGuessedThisRound: room.titleGuessedThisRound,
    track: currentTrack ? {
      id: currentTrack.id,
      previewUrl: currentTrack.previewUrl,
      title: room.isRevealed || room.titleGuessedThisRound ? currentTrack.title : "",
      artist: room.isRevealed || room.artistGuessedThisRound ? currentTrack.artist : "",
      artworkUrl: room.isRevealed ? currentTrack.artworkUrl : "",
      album: room.isRevealed ? currentTrack.album : ""
    } : null
  };
}

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Create Room
  socket.on("create_room", ({ playerName }) => {
    const roomCode = generateRoomCode();
    const player: Player = {
      id: socket.id,
      name: playerName || "DJ",
      score: 0,
      isHost: true,
    };

    rooms[roomCode] = {
      code: roomCode,
      hostId: socket.id,
      playlistName: "Aucune sélection",
      tracks: [],
      currentIndex: 0,
      isPlaying: false,
      isRevealed: false,
      isBuzzed: false,
      buzzedPlayerId: null,
      buzzedPlayerName: null,
      timeRemaining: 30,
      players: { [socket.id]: player },
      artistGuessedThisRound: false,
      titleGuessedThisRound: false,
    };

    socket.join(roomCode);
    socket.emit("room_created", { roomCode, player });
    socket.emit("room_state", getCleanRoomState(roomCode));
  });

  // Join Room
  socket.on("join_room", ({ roomCode, playerName }) => {
    const code = (roomCode || "").toUpperCase();
    const room = rooms[code];

    if (!room) {
      socket.emit("error_msg", "Ce salon n'existe pas ! Vérifiez le code.");
      return;
    }

    const player: Player = {
      id: socket.id,
      name: playerName || `Joueur ${Object.keys(room.players).length + 1}`,
      score: 0,
      isHost: false,
    };

    room.players[socket.id] = player;
    socket.join(code);

    // Notify room and joiner
    io.to(code).emit("player_joined", { player, players: Object.values(room.players) });
    io.to(code).emit("room_state", getCleanRoomState(code));
  });

  // Select Playlist
  socket.on("select_playlist", async ({ roomCode, playlistId, playlistSource, playlistName }) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;

    try {
      // Fetch playlist tracks from local express server API
      const response = await fetch(`http://127.0.0.1:${PORT}/api/playlists/${playlistSource}/${playlistId}`);
      if (!response.ok) {
        throw new Error("Impossible de charger la playlist");
      }
      const data = await response.json();
      const tracks = data.tracks || [];

      if (tracks.length === 0) {
        socket.emit("error_msg", "Cette playlist ne contient aucun morceau jouable.");
        return;
      }

      // Shuffle tracks for gameplay variety
      room.tracks = [...tracks].sort(() => Math.random() - 0.5);
      room.playlistName = playlistName || "Playlist En Ligne";
      room.currentIndex = 0;
      room.isPlaying = false;
      room.isRevealed = false;
      room.isBuzzed = false;
      room.buzzedPlayerId = null;
      room.buzzedPlayerName = null;

      io.to(roomCode).emit("room_state", getCleanRoomState(roomCode));
    } catch (err: any) {
      console.error("Select Playlist Error:", err);
      socket.emit("error_msg", "Erreur lors du chargement de la playlist.");
    }
  });

  // Start game
  socket.on("start_game", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id || room.tracks.length === 0) return;

    room.currentIndex = 0;
    startTrack(roomCode);
  });

  // Play / Pause Track (triggered by DJ)
  socket.on("toggle_play", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id || room.isRevealed || room.isBuzzed) return;

    room.isPlaying = !room.isPlaying;
    io.to(roomCode).emit("room_state", getCleanRoomState(roomCode));
  });

  // Buzz Track
  socket.on("buzz", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || !room.isPlaying || room.isBuzzed || room.isRevealed) return;

    const player = room.players[socket.id];
    if (!player) return;

    room.isPlaying = false;
    room.isBuzzed = true;
    room.buzzedPlayerId = socket.id;
    room.buzzedPlayerName = player.name;

    io.to(roomCode).emit("room_state", getCleanRoomState(roomCode));
    io.to(roomCode).emit("play_buzzer_sound");
  });

  // Submit Guess
  socket.on("submit_guess", ({ roomCode, artistInput, titleInput }) => {
    const room = rooms[roomCode];
    if (!room || !room.isBuzzed || room.buzzedPlayerId !== socket.id) return;

    const currentTrack = room.tracks[room.currentIndex];
    if (!currentTrack) return;

    let pointsAwarded = 0;
    let artistCorrect = false;
    let titleCorrect = false;

    if (!room.artistGuessedThisRound && artistInput) {
      if (compareTexts(artistInput, currentTrack.artist, true)) {
        artistCorrect = true;
        pointsAwarded += 1;
      }
    }

    if (!room.titleGuessedThisRound && titleInput) {
      if (compareTexts(titleInput, currentTrack.title, false)) {
        titleCorrect = true;
        pointsAwarded += 1;
      }
    }

    const player = room.players[socket.id];
    if (player) {
      player.score += pointsAwarded;
    }

    let feedbackText = "";
    if (artistCorrect && titleCorrect) {
      feedbackText = `🔥 Incroyable ! +2 pts pour ${player.name} (Artiste et Titre trouvés !)`;
      room.artistGuessedThisRound = true;
      room.titleGuessedThisRound = true;
    } else if (artistCorrect) {
      feedbackText = `🎵 Bravo ! +1 pt Artiste pour ${player.name} (${currentTrack.artist})`;
      room.artistGuessedThisRound = true;
    } else if (titleCorrect) {
      feedbackText = `🎸 Excellent ! +1 pt Titre pour ${player.name} (${currentTrack.title})`;
      room.titleGuessedThisRound = true;
    } else {
      feedbackText = `❌ Faux... Pas de points pour ${player.name} ! Le jeu reprend...`;
    }

    const isAllGuessed = room.artistGuessedThisRound && room.titleGuessedThisRound;

    if (isAllGuessed) {
      room.isRevealed = true;
      room.isBuzzed = false;
      room.buzzedPlayerId = null;
      room.buzzedPlayerName = null;
      room.isPlaying = false;
      if (roomIntervals[roomCode]) {
        clearInterval(roomIntervals[roomCode]);
      }

      io.to(roomCode).emit("guess_feedback", {
        success: true,
        text: feedbackText,
        scores: Object.values(room.players).map(p => ({ id: p.id, name: p.name, score: p.score })),
      });
      io.to(roomCode).emit("room_state", getCleanRoomState(roomCode));
    } else {
      room.isBuzzed = false;
      room.buzzedPlayerId = null;
      room.buzzedPlayerName = null;

      io.to(roomCode).emit("guess_feedback", {
        success: pointsAwarded > 0,
        text: feedbackText,
        scores: Object.values(room.players).map(p => ({ id: p.id, name: p.name, score: p.score })),
      });

      // Brief pause then auto resume
      setTimeout(() => {
        const r = rooms[roomCode];
        if (r && !r.isRevealed && !r.isBuzzed) {
          r.isPlaying = true;
          io.to(roomCode).emit("room_state", getCleanRoomState(roomCode));
          io.to(roomCode).emit("resume_audio");
        }
      }, 3500);
    }
  });

  // Skip / Next Track (triggered by DJ)
  socket.on("next_track", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;

    if (room.currentIndex + 1 < room.tracks.length) {
      room.currentIndex++;
      startTrack(roomCode);
    } else {
      // Game Over
      io.to(roomCode).emit("game_over", {
        rankings: Object.values(room.players).sort((a, b) => b.score - a.score),
      });
    }
  });

  // Skip round with reveal (language to the cat)
  socket.on("reveal_track", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;

    room.isRevealed = true;
    room.isPlaying = false;
    room.isBuzzed = false;
    room.buzzedPlayerId = null;
    room.buzzedPlayerName = null;

    if (roomIntervals[roomCode]) {
      clearInterval(roomIntervals[roomCode]);
    }

    io.to(roomCode).emit("room_state", getCleanRoomState(roomCode));
  });

  // Quit / Disconnect
  socket.on("quit_room", ({ roomCode }) => {
    handleQuit(socket, roomCode);
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
    for (const code of Object.keys(rooms)) {
      if (rooms[code].players[socket.id]) {
        handleQuit(socket, code);
      }
    }
  });
});

function handleQuit(socket: any, roomCode: string) {
  const room = rooms[roomCode];
  if (!room) return;

  const player = room.players[socket.id];
  if (!player) return;

  delete room.players[socket.id];
  socket.leave(roomCode);

  if (player.isHost) {
    // If Host leaves, notify room and destroy room
    io.to(roomCode).emit("error_msg", "Le DJ a quitté la partie. Le salon est fermé.");
    if (roomIntervals[roomCode]) {
      clearInterval(roomIntervals[roomCode]);
      delete roomIntervals[roomCode];
    }
    delete rooms[roomCode];
  } else {
    // Notify room of player leaving
    io.to(roomCode).emit("player_left", {
      playerId: socket.id,
      playerName: player.name,
      players: Object.values(room.players),
    });
    
    // If the leaving player was holding the buzzer, release it
    if (room.buzzedPlayerId === socket.id) {
      room.isBuzzed = false;
      room.buzzedPlayerId = null;
      room.buzzedPlayerName = null;
      room.isPlaying = true;
      io.to(roomCode).emit("room_state", getCleanRoomState(roomCode));
      io.to(roomCode).emit("resume_audio");
    } else {
      io.to(roomCode).emit("room_state", getCleanRoomState(roomCode));
    }
  }
}

function startTrack(roomCode: string) {
  const room = rooms[roomCode];
  if (!room) return;

  room.isPlaying = true;
  room.isRevealed = false;
  room.isBuzzed = false;
  room.buzzedPlayerId = null;
  room.buzzedPlayerName = null;
  room.timeRemaining = 30;
  room.artistGuessedThisRound = false;
  room.titleGuessedThisRound = false;

  io.to(roomCode).emit("room_state", getCleanRoomState(roomCode));

  // Clear timer and start tick
  if (roomIntervals[roomCode]) {
    clearInterval(roomIntervals[roomCode]);
  }

  roomIntervals[roomCode] = setInterval(() => {
    const r = rooms[roomCode];
    if (!r) {
      clearInterval(roomIntervals[roomCode]);
      return;
    }

    if (r.isPlaying && !r.isBuzzed && r.timeRemaining > 0) {
      r.timeRemaining--;
      io.to(roomCode).emit("timer_tick", { timeRemaining: r.timeRemaining });

      if (r.timeRemaining <= 0) {
        clearInterval(roomIntervals[roomCode]);
        r.isPlaying = false;
        r.isRevealed = true;
        io.to(roomCode).emit("room_state", getCleanRoomState(roomCode));
      }
    }
  }, 1000);
}

startServer();
