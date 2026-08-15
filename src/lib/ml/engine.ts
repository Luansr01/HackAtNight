// src/lib/ml/engine.ts

export type AudioFeatures = [number, number, number, number, number]; 

export interface Track {
  id: string;
  title: string;
  artist: string;
  cover: string;
  previewUrl: string;
  genre: string;
  features: AudioFeatures; 
  bpm: number; 
  key: number; 
  mode: number; 
}

export interface UserSession {
  initialGenres: string[];
  genreScores: Record<string, number>;
  likedBPMs: number[];
  likedKeys: { key: number, mode: number }[];
  seenArtists: Set<string>;
}

// 1. Compatibilidade de Tonalidade (Camelot Wheel) com TRAVA DE SEGURANÇA
const getKeyCompatibility = (trackKey: number, trackMode: number, likedKeys: {key: number, mode: number}[]): number => {
  if (trackKey === undefined || trackMode === undefined) return 0.5; // Trava anti-NaN
  if (likedKeys.length === 0) return 0.5; 
  
  let maxCompat = 0;
  for (const lk of likedKeys) {
    if (lk.key === trackKey && lk.mode === trackMode) return 1.0; 
    if (lk.key === trackKey && lk.mode !== trackMode) maxCompat = Math.max(maxCompat, 0.7); 
    
    const diff = Math.abs(lk.key - trackKey);
    if ((diff === 7 || diff === 5) && lk.mode === trackMode) maxCompat = Math.max(maxCompat, 0.85);
  }
  return maxCompat;
};

// 2. Similaridade de BPM com TRAVA DE SEGURANÇA
const getBpmSimilarity = (trackBpm: number, likedBPMs: number[]): number => {
  if (trackBpm === undefined || isNaN(trackBpm)) return 0.5; // Trava anti-NaN
  if (likedBPMs.length === 0) return 0.5; 
  
  const avgBpm = likedBPMs.reduce((a, b) => a + b, 0) / likedBPMs.length;
  const diff = Math.abs(trackBpm - avgBpm);
  
  return Math.max(0, 1 - (diff / 40)); 
};

// 3. O Motor de Recomendação Composto
export const getNextRecommendations = (
  session: UserSession,
  catalog: Track[],
  seenIds: Set<string>, // Agora isso inclui a fila inteira!
  topK: number = 5
): Track[] => {
  
  const unseen = catalog.filter(t => !seenIds.has(t.id));
  
  const scored = unseen.map(track => {
    // REGRA 1: Não repetir artista NUNCA
    if (session.seenArtists.has(track.artist)) {
      return { track, score: -9999 };
    }

    let genreScore = session.genreScores[track.genre] || 0;
    
    // Bônus de Gêneros Iniciais (Case Insensitive para evitar falhas)
    const isInitialGenre = session.initialGenres.some(g => g.toLowerCase() === (track.genre || "").toLowerCase());
    if (isInitialGenre) {
      genreScore += 2; 
    }

    const genrePenalty = genreScore < 0 ? Math.abs(genreScore) * 1.5 : 0;

    const bpmScore = getBpmSimilarity(track.bpm, session.likedBPMs);
    const keyScore = getKeyCompatibility(track.key, track.mode, session.likedKeys);

    const W_GENRE = 1.2; 
    const W_BPM = 0.8;   
    const W_KEY = 0.5;   
    
    // Proteção final contra NaN
    let finalScore = (Math.max(0, genreScore) * W_GENRE) + (bpmScore * W_BPM) + (keyScore * W_KEY) - genrePenalty;
    if (isNaN(finalScore)) finalScore = -9999;

    return { track, score: finalScore };
  });

  const validTracks = scored.filter(s => s.score > -9000);
  validTracks.sort((a, b) => b.score - a.score);

  return validTracks.slice(0, topK).map(s => s.track);
};