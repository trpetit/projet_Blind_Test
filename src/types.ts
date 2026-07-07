export interface Track {
  id: string;
  title: string;
  artist: string;
  previewUrl: string; // Dynamic local Object URL or Spotify/Deezer/iTunes mp3 preview
  artworkUrl?: string;
  album?: string;
  isLocal?: boolean;
}

export type GameStatus = 'LOBBY' | 'PLAYING' | 'BUZZED' | 'SUMMARY';

export interface RoundResult {
  track: Track;
  artistCorrect: boolean;
  titleCorrect: boolean;
  artistGuess: string;
  titleGuess: string;
  pointsAwarded: number; // 0, 1, or 2
}

export interface GameState {
  status: GameStatus;
  score: number;
  tracks: Track[];
  currentIndex: number;
  artistGuessed: boolean;
  titleGuessed: boolean;
  timeRemaining: number; // seconds remaining in current round
  roundResults: RoundResult[];
}

export type PlayMode = 'LOCAL' | 'ONLINE';

export interface PlaylistInfo {
  id: string;
  name: string;
  description: string;
  artworkUrl: string;
  trackCount: number;
  source: 'SPOTIFY' | 'DEEZER' | 'PRESET';
}
