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
  // Adicione outros artistas aqui se notar que a Apple está errando
};

export const fetchTracks = async (term: string): Promise<Track[]> => {
  try {
    const isGenreSearch = KNOWN_GENRES.includes(term.trim().toLowerCase());
    
    const url = isGenreSearch 
      ? `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&attribute=genreTerm&entity=song&limit=20`
      : `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=20`;

    const res = await fetch(url);
    const data = await res.json();
    
    return data.results
      .filter((r: any) => r.previewUrl)
      .map((r: any): Track => {
        const base = genreBaselines[term] || [0.5, 0.5, 0.5, 0.5, 0.5];
        const features = base.map(val => Math.max(0, Math.min(1, val + (Math.random() * 0.2 - 0.1)))) as AudioFeatures;

        const artistLower = r.artistName.toLowerCase();
        // Se estiver no nosso dicionário, força o gênero correto. Se não, usa o da Apple.
        const fixedGenre = ARTIST_GENRE_FIX[artistLower] || r.primaryGenreName || term;

        return {
          id: r.trackId.toString(),
          title: r.trackName,
          artist: r.artistName,
          cover: r.artworkUrl100.replace('100x100', '600x600'),
          previewUrl: r.previewUrl,
          genre: fixedGenre,
          features
        };
      });
  } catch (err) {
    console.error("API falhou", err);
    return []; 
  }
};