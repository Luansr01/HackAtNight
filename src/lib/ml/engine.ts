// src/lib/ml/engine.ts

export type AudioFeatures = [number, number, number, number, number]; // [Energy, Danceability, Valence, Acousticness, TempoNorm]

export interface Track {
  id: string;
  title: string;
  artist: string;
  cover: string;
  previewUrl: string;
  genre: string;
  features: AudioFeatures; 
}

// 1. Cosine Similarity Formula
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] ** 2;
    normB += vecB[i] ** 2;
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// 2. Fast Like Weighting Formula
export const calculateTimeWeight = (reactionTimeMs: number, maxTimeMs: number = 10000): number => {
  const seconds = reactionTimeMs / 1000;
  const tMax = maxTimeMs / 1000;
  // Se clicou rápido, ganha até 2x de peso. Se demorou, peso 1.
  return 1 + Math.max(0, 1 - (seconds / tMax));
};

// 3. Update User Profile Profile (Exploitation vs Exploration)
export const updateUserProfile = (
  currentProfile: AudioFeatures,
  trackFeatures: AudioFeatures,
  liked: boolean,
  reactionTimeMs: number
): AudioFeatures => {
  const learningRate = 0.2; // Quão rápido o perfil muda
  const weight = liked ? calculateTimeWeight(reactionTimeMs) : 1.5; // Penalidade maior em rejeição
  const direction = liked ? 1 : -1; // Aproximar (1) ou Afastar (-1)

  return currentProfile.map((val, i) => {
    let newVal = val + (direction * learningRate * weight * (trackFeatures[i] - val));
    return Math.max(0, Math.min(1, newVal)); // Clamp entre 0 e 1
  }) as AudioFeatures;
};

// src/lib/ml/engine.ts (Adicione/Substitua apenas a função getNextRecommendations)

export const getNextRecommendations = (
  profile: AudioFeatures,
  catalog: Track[],
  seenIds: Set<string>,
  genreScores: Record<string, number>, // Novo Cérebro de Punição/Recompensa
  topK: number = 5
): Track[] => {
  const unseen = catalog.filter(t => !seenIds.has(t.id));
  
  const scored = unseen.map(track => {
    const baseScore = cosineSimilarity(profile, track.features);
    
    // Cada Rejeição tira 15% de chance dessa música aparecer. Curtidas/Buscas dão +15%
    const genreScore = genreScores[track.genre] || 0;
    const penaltyBonus = genreScore * 0.15; 
    
    // Previne que o score fique menor que 0
    const finalScore = Math.max(0.01, baseScore + penaltyBonus);
    
    return { track, score: finalScore };
  });

  // Ordena do maior Score para o menor
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(s => s.track);
};