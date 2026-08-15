// src/services/itunes.ts
import { Track, AudioFeatures } from '../lib/ml/engine';

const KNOWN_GENRES = [
  "rock", "classic rock", "hard rock", "alternative rock", "indie rock", "punk", "post-punk", "grunge", "psychedelic rock", "math rock", "post-rock",
  "metal", "heavy metal", "thrash metal", "death metal", "black metal", "nu metal", "alternative metal", "post-metal", "doom metal", "sludge metal", "shoegaze", "metalcore", "deathcore",
  "mpb", "samba", "bossa nova", "tropicália", "folk regional", "música gaúcha", "sertanejo", "forró", "axé", "funk carioca", "choro",
  "pop", "indie pop", "synthpop", "k-pop", "j-pop", "city pop", "dream pop", "electropop", "hyperpop",
  "hip hop", "rap", "trap", "r&b", "soul", "neo-soul", "funk", "lo-fi hip hop",
  "electronic", "techno", "house", "trance", "dubstep", "drum and bass", "synthwave", "vaporwave", "ambient", "idm", "edm",
  "jazz", "blues", "smooth jazz", "bebop", "classical", "baroque", "romantic", "contemporary classical",
  "reggae", "ska", "afrobeats", "dancehall", "country", "folk", "bluegrass", "throat singing", "celtic", "latin", "reggaeton", "salsa",
  "soundtrack", "video game music", "acoustic", "vocal", "experimental", "industrial", "goth"
];

const genreBaselines: Record<string, AudioFeatures> = {
  "Nu Metal": [0.9, 0.4, 0.3, 0.05, 0.8],
  "Pop": [0.7, 0.8, 0.7, 0.2, 0.6],
  "Jazz": [0.4, 0.5, 0.6, 0.8, 0.4],
  "Electronic": [0.8, 0.9, 0.5, 0.1, 0.9],
  "Samba": [0.7, 0.9, 0.8, 0.6, 0.6],
  "Sertanejo": [0.6, 0.7, 0.7, 0.5, 0.5]
};

// Dicionário para corrigir os metadados preguiçosos da Apple
const ARTIST_GENRE_FIX: Record<string, string> = {
  "bruno e marrone": "Sertanejo",
  "jorge & mateus": "Sertanejo",
  "marília mendonça": "Sertanejo",
  "gusttavo lima": "Sertanejo",
};

export const fetchTracks = async (term: string): Promise<Track[]> => {
  try {
    const isGenreSearch = KNOWN_GENRES.includes(term.trim().toLowerCase());
    
    const url = isGenreSearch 
      ? `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&attribute=genreTerm&entity=song&limit=30`
      : `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=30`;

    const res = await fetch(url);
    const data = await res.json();
    
    // Map para deduplicar e Filtros Anti-Eco
    const uniqueTracks = new Map<string, Track>();

    data.results
      .filter((r: any) => r.previewUrl)
      .forEach((r: any) => {
        const simpleTitle = r.trackName.toLowerCase().split('(')[0].split('-')[0].trim();
        const artistLower = r.artistName.toLowerCase();
        const termLower = term.trim().toLowerCase();
        
        // ANTI-ECO 1: Ignora se a música tiver exatamente o nome do artista
        if (simpleTitle === artistLower) return;

        // ANTI-ECO 2: Se for busca de gênero, ignora músicas com o nome do gênero
        if (isGenreSearch && simpleTitle === termLower) return;

        const uniqueKey = `${artistLower}-${simpleTitle}`;

        if (!uniqueTracks.has(uniqueKey)) {
          const base = genreBaselines[term] || [0.5, 0.5, 0.5, 0.5, 0.5];
          const features = base.map((val: number) => Math.max(0, Math.min(1, val + (Math.random() * 0.2 - 0.1)))) as AudioFeatures;
          const fixedGenre = ARTIST_GENRE_FIX[artistLower] || r.primaryGenreName || term;

          // GERADOR DETERMINÍSTICO DE BPM E TONALIDADE (Com base no ID da música)
          let hash = 0;
          const trackIdStr = r.trackId.toString();
          for (let i = 0; i < trackIdStr.length; i++) {
            hash = ((hash << 5) - hash) + trackIdStr.charCodeAt(i);
            hash |= 0;
          }
          
          const simulatedBpm = 80 + (Math.abs(hash) % 80); // BPM fixo entre 80 e 160
          const simulatedKey = Math.abs(hash) % 12; // Tom fixo 0 a 11
          const simulatedMode = Math.abs(hash) % 2; // Modo fixo 0 ou 1

          uniqueTracks.set(uniqueKey, {
            id: trackIdStr,
            title: r.trackName,
            artist: r.artistName,
            cover: r.artworkUrl100.replace('100x100', '600x600'),
            previewUrl: r.previewUrl,
            genre: fixedGenre,
            features,
            bpm: simulatedBpm,
            key: simulatedKey,
            mode: simulatedMode
          });
        }
      });

    return Array.from(uniqueTracks.values());
  } catch (err) {
    console.error("API falhou", err);
    return []; 
  }
};