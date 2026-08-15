// src/data/fallback.ts
import { Track } from '../lib/ml/engine';

export const OFFLINE_CATALOG: Track[] = [
  {
    id: "1", title: "My Own Summer", artist: "Deftones", 
    cover: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/95/92/7d/95927d6d-6869-7c46-9b5d-0fc40871ea02/093624926521.jpg/600x600bb.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/37/10/9e/37109e45-f0fb-881c-cc66-0775d71b3e1f/mzaf_10486877864391629864.plus.aac.p.m4a",
    genre: "Nu Metal", features: [0.95, 0.4, 0.2, 0.01, 0.75]
  },
  // ADICIONE MAIS 19 FAIXAS AQUI PARA GARANTIR A DEMO
];