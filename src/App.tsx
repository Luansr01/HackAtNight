// src/App.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Track, getNextRecommendations, UserSession } from './lib/ml/engine';
import { fetchTracks } from './services/itunes';
import { OFFLINE_CATALOG } from './data/fallback';

// ============================================================================
// ÍCONES CUSTOMIZADOS
// ============================================================================
const ZapIcon = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>);
const SearchIcon = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>);
const PlayIcon = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>);
const PauseIcon = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>);
const HeartIcon = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>);
const HeartSolidIcon = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>);
const XIcon = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>);
const TrashIcon = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>);
const CopyIcon = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>);
const BarChartIcon = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>);
const LayoutGridIcon = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>);
const UserIcon = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>);
const TagIcon = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>);

const AnimatedWaveform = ({ isPlaying }: { isPlaying: boolean }) => (
  <div className="flex items-end justify-center space-x-1 h-8 opacity-80">
    {[...Array(12)].map((_, i) => (
      <div key={i} className={`w-1.5 bg-white rounded-t-sm transition-all duration-150 ${isPlaying ? 'animate-pulse' : ''}`} style={{ height: isPlaying ? `${Math.max(20, Math.random() * 100)}%` : '20%', animationDuration: `${0.5 + Math.random() * 0.5}s`, animationDelay: `${Math.random() * 0.2}s` }} />
    ))}
  </div>
);

// ============================================================================
// DICIONÁRIOS
// ============================================================================
const ALL_GENRES = [
  "Rock", "Classic Rock", "Hard Rock", "Alternative Rock", "Indie Rock", "Punk", "Post-Punk", "Grunge", "Psychedelic Rock", "Math Rock", "Post-Rock",
  "Metal", "Heavy Metal", "Thrash Metal", "Death Metal", "Black Metal", "Nu Metal", "Alternative Metal", "Post-Metal", "Doom Metal", "Sludge Metal", "Shoegaze", "Metalcore", "Deathcore",
  "MPB", "Samba", "Bossa Nova", "Tropicália", "Folk Regional", "Música Gaúcha", "Sertanejo", "Forró", "Axé", "Funk Carioca", "Choro",
  "Pop", "Indie Pop", "Synthpop", "K-Pop", "J-Pop", "City Pop", "Dream Pop", "Electropop", "Hyperpop",
  "Hip Hop", "Rap", "Trap", "R&B", "Soul", "Neo-Soul", "Funk", "Lo-Fi Hip Hop",
  "Electronic", "Techno", "House", "Trance", "Dubstep", "Drum and Bass", "Synthwave", "Vaporwave", "Ambient", "IDM", "EDM",
  "Jazz", "Blues", "Smooth Jazz", "Bebop", "Classical", "Baroque", "Romantic", "Contemporary Classical",
  "Reggae", "Ska", "Afrobeats", "Dancehall", "Country", "Folk", "Bluegrass", "Throat Singing", "Celtic", "Latin", "Reggaeton", "Salsa",
  "Soundtrack", "Video Game Music", "Acoustic", "Vocal", "Experimental", "Industrial", "Goth"
];

const ONBOARDING_GENRES = [
  "Rock", "Pop", "Metal", "Hip Hop", "Electronic", "Sertanejo", "MPB", "Música Gaúcha", "Jazz", "Classical", "Samba", "Reggae", "Funk Carioca", "Blues", "Country"
];

const KEYS_MAP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MODES_MAP = ["Menor", "Maior"];
const DURATION = 30;

export default function SoundSwipe() {
  const [appState, setAppState] = useState<"onboarding" | "main">("onboarding");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isLoadingMain, setIsLoadingMain] = useState(false);
  const [activeTab, setActiveTab] = useState('discovery');
  
  // --- Estados do Motor Musical ---
  const [catalog, setCatalog] = useState<Track[]>([]);
  const [queue, setQueue] = useState<Track[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  
  const [genreScores, setGenreScores] = useState<Record<string, number>>({});
  const [likedBPMs, setLikedBPMs] = useState<number[]>([]);
  const [likedKeys, setLikedKeys] = useState<{key: number, mode: number}[]>([]);
  const [seenArtists, setSeenArtists] = useState<Set<string>>(new Set());
  
  const [startTime, setStartTime] = useState<number>(Date.now());

  // --- UI ---
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<{type: 'genre'|'track', label: string, value: string}[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showExportBox, setShowExportBox] = useState(false); // NOVO: Controle da Caixa de Texto
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  const [savedTracks, setSavedTracks] = useState<Track[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = queue[currentIdx] ?? null;
  const isFinished = currentIdx >= queue.length && queue.length > 0;

  // Autocomplete
  useEffect(() => {
    if (searchTerm.length < 2) { setSuggestions([]); setIsSuggesting(false); return; }
    setIsSuggesting(true);
    const timer = setTimeout(async () => {
      const matchedGenres = ALL_GENRES.filter(g => g.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 2).map(g => ({ type: 'genre' as const, label: `${g}`, value: g }));
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=4`);
        const data = await res.json();
        const matchedTracks = data.results.map((r: any) => ({ type: 'track' as const, label: `${r.trackName} - ${r.artistName}`, value: `${r.artistName} ${r.trackName}` }));
        const uniqueSuggestions = Array.from(new Set([...matchedGenres, ...matchedTracks].map(s => s.label))).map(label => [...matchedGenres, ...matchedTracks].find(s => s.label === label)!);
        setSuggestions(uniqueSuggestions.slice(0, 6));
      } catch (e) {
        setSuggestions(matchedGenres); 
      } finally { setIsSuggesting(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) setShowDropdown(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const startDiscovery = async () => {
    setIsLoadingMain(true);
    try {
      const fetches = selectedGenres.map(genre => fetchTracks(genre));
      const results = await Promise.all(fetches);
      let allTracks = results.flat().sort(() => Math.random() - 0.5);
      if (allTracks.length === 0) allTracks = OFFLINE_CATALOG as any; 

      setCatalog(allTracks);
      setQueue(allTracks.slice(0, 5));
      setSeenIds(new Set([allTracks[0].id]));
      setCurrentIdx(0);
      setStartTime(Date.now());
      setAppState("main");
    } catch (error) {
      console.error("Erro no cold start", error);
    } finally {
      setIsLoadingMain(false);
    }
  };

 // =======================================================================
  // INJEÇÃO CORRIGIDA: Voltamos para a sua lógica original de substituição!
  // =======================================================================
  const applySeed = async (term: string) => {
    if (!term.trim()) return;
    setShowDropdown(false);
    setIsLoadingMain(true);
    
    let tracks = await fetchTracks(term);
    
    if (tracks.length > 0) {
      const updatedGenreScores = { ...genreScores, [term]: Math.max(genreScores[term] || 0, 1.5) };
      setGenreScores(updatedGenreScores);

      const newCatalog = [...tracks, ...catalog];
      setCatalog(newCatalog);
      
      const tracksToInject = tracks.slice(0, 3);
      
      // Perdão pro Artista: Se a pessoa pesquisou, tira a banda da lista negra
      const tempSeenArtists = new Set(seenArtists);
      tracksToInject.forEach(t => tempSeenArtists.delete(t.artist));
      setSeenArtists(tempSeenArtists);

      const tempSeenIds = new Set(seenIds);
      tracksToInject.forEach(t => tempSeenIds.add(t.id));
      setSeenIds(tempSeenIds);

      const session: UserSession = { 
        initialGenres: selectedGenres, 
        genreScores: updatedGenreScores, 
        likedBPMs, 
        likedKeys, 
        seenArtists: tempSeenArtists 
      };
      
      const extraRecs = getNextRecommendations(session, newCatalog, tempSeenIds, 5);

      // A SUA LÓGICA QUE FUNCIONAVA: Pega o histórico ANTES da música atual e sobrescreve ela!
      setQueue(prev => {
        const pastHistory = prev.slice(0, currentIdx); 
        return [...pastHistory, ...tracksToInject, ...extraRecs];
      });
      
      // Como não mudamos o currentIdx, forçamos a interface a zerar para a nova música
      setProgress(0);
      setCurrentTime("0:00");
      setIsPlaying(true);
      setStartTime(Date.now()); 
      setSearchTerm("");
    }
    setIsLoadingMain(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => { 
    e.preventDefault(); 
    applySeed(searchTerm); 
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      setProgress((current / DURATION) * 100);
      const mins = Math.floor(current / 60);
      const secs = Math.floor(current % 60);
      setCurrentTime(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
    }
  };

  useEffect(() => {
    setProgress(0);
    setCurrentTime("0:00");
    setIsPlaying(false);
    setStartTime(Date.now()); 
  }, [currentIdx]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(e => console.warn("Blocked:", e));
    setIsPlaying(!isPlaying);
  }, [isPlaying, currentTrack]);

  // AÇÕES DE LIKES/DISLIKES
  const handleAction = useCallback((isLike: boolean) => {
    if (!currentTrack || swipeDir) return;
    setSwipeDir(isLike ? "right" : "left");
    
    const reactionTimeMs = Date.now() - startTime;
    const isFastAction = reactionTimeMs < 3500; 
    
    const newSeenIds = new Set(seenIds).add(currentTrack.id);
    const newSeenArtists = new Set(seenArtists).add(currentTrack.artist); // Artista Avaliado = Banido
    setSeenIds(newSeenIds);
    setSeenArtists(newSeenArtists);

    let newLikedBPMs = likedBPMs;
    let newLikedKeys = likedKeys;
    const newGenreScores = { ...genreScores };

    if (isLike) {
      newLikedBPMs = [...likedBPMs, currentTrack.bpm];
      newLikedKeys = [...likedKeys, { key: currentTrack.key, mode: currentTrack.mode }];
      setLikedBPMs(newLikedBPMs);
      setLikedKeys(newLikedKeys);
      
      const bump = isFastAction ? 1.5 : 1.0;
      newGenreScores[currentTrack.genre] = (newGenreScores[currentTrack.genre] || 0) + bump;
      setSavedTracks(prev => prev.find(t => t.id === currentTrack.id) ? prev : [currentTrack, ...prev]);
    } else {
      const penalty = isFastAction ? 2.0 : 1.0;
      newGenreScores[currentTrack.genre] = (newGenreScores[currentTrack.genre] || 0) - penalty;
    }
    setGenreScores(newGenreScores);

    const currentQueueIds = new Set(queue.map(t => t.id));
    const mergedSeenIds = new Set([...newSeenIds, ...currentQueueIds]);

    const currentSession: UserSession = {
      initialGenres: selectedGenres,
      genreScores: newGenreScores,
      likedBPMs: newLikedBPMs,
      likedKeys: newLikedKeys,
      seenArtists: newSeenArtists
    };

    const nextRecs = getNextRecommendations(currentSession, catalog, mergedSeenIds, 5);

    setTimeout(() => {
      setQueue(prev => {
        const newItems = nextRecs.filter(r => !prev.find(p => p.id === r.id));
        return [...prev, ...newItems];
      });
      setSwipeDir(null);
      setCurrentIdx(i => i + 1);
    }, 300);
  }, [currentTrack, swipeDir, startTime, seenIds, seenArtists, likedBPMs, likedKeys, genreScores, selectedGenres, catalog, queue]);

  useEffect(() => {
    if (appState !== 'main' || activeTab !== 'discovery') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === "ArrowLeft") { e.preventDefault(); handleAction(false); }
      else if (e.key === "ArrowRight") { e.preventDefault(); handleAction(true); }
      else if (e.key === " ") { e.preventDefault(); togglePlay(); }
      else if (e.code === "KeyR") { e.preventDefault(); document.getElementById('search-input')?.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appState, activeTab, handleAction, togglePlay]);

  const getStats = useCallback(() => {
    const artistCounts: Record<string, number> = {};
    const genreMap: Record<string, number> = {};
    let totalBpm = 0;
    const keyMap: Record<string, number> = {};

    savedTracks.forEach(t => {
      artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
      const g = t.genre.split(" / ")[0];
      genreMap[g] = (genreMap[g] || 0) + 1;
      totalBpm += t.bpm;
      const keyStr = `${KEYS_MAP[t.key]} ${MODES_MAP[t.mode]}`;
      keyMap[keyStr] = (keyMap[keyStr] || 0) + 1;
    });

    const topArtists = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topGenres = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const avgBpm = savedTracks.length > 0 ? Math.round(totalBpm / savedTracks.length) : 0;
    const topKey = Object.entries(keyMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    return { topArtists, topGenres, avgBpm, topKey };
  }, [savedTracks]);

  const copyPlaylist = () => {
    const text = savedTracks.map(t => `${t.artist} - ${t.title}`).join('\n');
    navigator.clipboard.writeText(text);
    setShowExportBox(true); // Exibe a caixinha com o texto bruto
    
    const btn = document.getElementById('export-btn');
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = `<span class="text-[#22C55E]">Copiado!</span>`;
      setTimeout(() => btn.innerHTML = originalText, 2000);
    }
  };

  const cardTransform = swipeDir === "left" ? "translateX(-80px) rotate(-5deg)" : swipeDir === "right" ? "translateX(80px) rotate(5deg)" : "translateX(0) rotate(0deg)";

  if (appState === "onboarding") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F0F12] text-gray-100 font-sans p-6">
        <div className="text-center mb-12 max-w-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#22C55E] flex items-center justify-center mx-auto mb-6 shadow-[0_0_32px_rgba(139,92,246,0.5)]">
            <ZapIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">O que você curte ouvir?</h1>
          <p className="text-gray-400 text-lg">Escolha 3 gêneros para ditar a Teoria Musical do seu algoritmo inicial.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mb-12">
          {ONBOARDING_GENRES.map(genre => {
            const isSelected = selectedGenres.includes(genre);
            return (
              <button key={genre} onClick={() => setSelectedGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre])}
                className={`px-6 py-3 rounded-full text-sm md:text-base font-semibold transition-all duration-200 transform ${isSelected ? "bg-[#8B5CF6]/15 border-2 border-[#8B5CF6] text-[#A78BFA] scale-105 shadow-[0_0_20px_rgba(139,92,246,0.3)]" : "bg-[#18181B] border-2 border-[#27272A] text-gray-200 hover:border-[#3F3F46]"}`}>
                {genre}
              </button>
            )
          })}
        </div>
        <button onClick={startDiscovery} disabled={selectedGenres.length < 3 || isLoadingMain}
          className={`px-12 py-4 rounded-full text-lg font-bold transition-all duration-300 ${selectedGenres.length >= 3 && !isLoadingMain ? "bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white shadow-[0_0_32px_rgba(34,197,94,0.4)] hover:scale-105 cursor-pointer" : "bg-[#27272A] text-gray-500 cursor-not-allowed"}`}>
          {isLoadingMain ? "Sintetizando IA..." : `Construir Radar Musical (${selectedGenres.length}/3)`}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#0F0F12] text-gray-100 font-sans overflow-hidden">
      {currentTrack && (<audio ref={audioRef} src={currentTrack.previewUrl} autoPlay onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onEnded={() => handleAction(false)} preload="auto" />)}
      
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-[#18181B] border-b border-[#27272A] z-20 shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center shadow-lg shadow-[#8B5CF6]/30"><ZapIcon className="text-white w-6 h-6" /></div>
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Off Track</h1>
        </div>
        <div className="hidden md:flex items-center bg-[#0F0F12] p-1.5 rounded-xl border border-[#27272A] shadow-inner">
          <button onClick={() => setActiveTab('discovery')} className={`flex items-center px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'discovery' ? 'bg-[#27272A] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200 hover:bg-[#18181B]'}`}><LayoutGridIcon className="w-4 h-4 mr-2" />Discovery Core</button>
          <button onClick={() => setActiveTab('statistics')} className={`flex items-center px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'statistics' ? 'bg-[#27272A] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200 hover:bg-[#18181B]'}`}><BarChartIcon className="w-4 h-4 mr-2" />Statistics</button>
        </div>
        <div className="flex items-center space-x-3 bg-[#0F0F12] px-4 py-2 rounded-full border border-[#27272A]">
          <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E] shadow-[0_0_8px_#22C55E] animate-pulse"></div>
          <span className="text-xs font-semibold tracking-wider text-gray-300 uppercase">Teoria Musical Ativa</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col relative overflow-y-auto custom-scrollbar">
          {activeTab === 'discovery' && (
            <>
              <div className="w-full max-w-2xl mx-auto mt-8 px-6 z-30" ref={searchContainerRef}>
                <form onSubmit={handleSearchSubmit} className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none z-10"><SearchIcon className="w-5 h-5 text-gray-500 group-focus-within:text-[#8B5CF6] transition-colors" /></div>
                  <input id="search-input" type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }} onFocus={() => searchTerm.length > 2 && setShowDropdown(true)} placeholder="Apply Music Genre and/or Artist (i.e. Deftones, Indie...)" className="w-full bg-[#18181B] border border-[#27272A] rounded-2xl py-4 pl-12 pr-24 text-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50 focus:border-[#8B5CF6] transition-all shadow-xl relative z-10" autoComplete="off" />
                  <button type="submit" className="absolute inset-y-2 right-2 px-6 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold rounded-xl transition-colors shadow-lg shadow-[#8B5CF6]/20 z-10">Apply</button>
                  {showDropdown && searchTerm.length > 2 && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-[#18181B] border border-[#27272A] rounded-2xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden z-50 transform origin-top transition-all">
                       {isSuggesting ? (
                           <div className="p-8 flex flex-col justify-center items-center space-y-3"><div className="w-6 h-6 border-2 border-[#27272A] border-t-[#8B5CF6] rounded-full animate-spin"></div><span className="text-gray-500 text-sm">Analisando...</span></div>
                       ) : suggestions.length > 0 ? (
                           <ul className="py-2 max-h-[60vh] overflow-y-auto custom-scrollbar m-0 list-none">
                             {suggestions.map((sugg, i) => (
                               <li key={i} onMouseDown={(e) => { e.preventDefault(); applySeed(sugg.value); }} className="flex items-center gap-3 px-4 py-3 mx-2 rounded-xl cursor-pointer transition-colors hover:bg-[#27272A]">
                                 {sugg.type === 'genre' ? <TagIcon className="w-4 h-4 text-[#A78BFA]" /> : <UserIcon className="w-4 h-4 text-gray-400" />}
                                 <span className={`text-sm ${sugg.type === 'genre' ? 'text-[#A78BFA] font-bold' : 'text-gray-200 font-medium'}`}>{sugg.label}</span>
                               </li>
                             ))}
                           </ul>
                       ) : ( <div className="p-6 text-center text-gray-500 text-sm">Aperte Enter para buscar "{searchTerm}"</div> )}
                    </div>
                  )}
                </form>
              </div>

              <div className="flex-1 flex items-center justify-center p-6 relative z-10">
                {isLoadingMain ? (
                  <div className="flex flex-col items-center space-y-4"><div className="w-16 h-16 border-4 border-[#27272A] border-t-[#8B5CF6] rounded-full animate-spin"></div><p className="text-gray-400 font-medium">Extraindo Harmonia Musical...</p></div>
                ) : isFinished ? (
                  <div className="text-center space-y-6 max-w-md bg-[#18181B] p-10 rounded-3xl border border-[#27272A]"><div className="w-20 h-20 mx-auto bg-gray-800 rounded-full flex items-center justify-center mb-4"><SearchIcon className="w-10 h-10 text-gray-400" /></div><h2 className="text-2xl font-bold text-white">Fim da Fila</h2><p className="text-gray-400">Você esgotou o catálogo. Pesquise no topo para expandir.</p></div>
                ) : currentTrack ? (
                  <div className="w-full max-w-md bg-[#18181B] rounded-[32px] border border-[#27272A] shadow-2xl overflow-hidden flex flex-col group transition-all duration-300" style={{ transform: cardTransform, opacity: swipeDir ? 0 : 1 }}>
                    <div className="relative aspect-square w-full bg-gray-900 group">
                      <img src={currentTrack.cover} alt={currentTrack.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={togglePlay} className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 hover:scale-105 transition-all shadow-2xl">
                          {isPlaying ? <PauseIcon className="w-8 h-8 text-white" /> : <PlayIcon className="w-8 h-8 text-white ml-1" />}
                        </button>
                      </div>
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className="px-4 py-1.5 rounded-full bg-[#8B5CF6]/90 backdrop-blur-sm text-white text-sm font-semibold shadow-lg">{currentTrack.genre}</span>
                        <span className="px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-[#A1A1AA] text-xs font-mono font-bold shadow-lg flex items-center">{currentTrack.bpm} BPM</span>
                        <span className="px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-[#A1A1AA] text-xs font-mono font-bold shadow-lg flex items-center">{KEYS_MAP[currentTrack.key]} {MODES_MAP[currentTrack.mode]}</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-2"><AnimatedWaveform isPlaying={isPlaying} /></div>
                    </div>
                    <div className="p-8 pb-10 flex flex-col items-center text-center space-y-8">
                      <div className="space-y-1 w-full"><h2 className="text-3xl font-bold text-white truncate px-2">{currentTrack.title}</h2><p className="text-xl text-gray-400 font-medium truncate px-2">{currentTrack.artist}</p></div>
                      <div className="w-full space-y-2 cursor-pointer" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); if (audioRef.current) audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * DURATION; }}>
                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#22C55E] transition-all duration-100 ease-linear" style={{ width: `${progress}%` }}></div></div>
                        <div className="flex justify-between text-xs text-gray-500 font-medium font-mono tracking-wider"><span>{currentTime}</span><span>0:30</span></div>
                      </div>
                      <div className="flex items-center justify-center space-x-8 w-full pt-4">
                        <button onClick={() => handleAction(false)} className="w-16 h-16 rounded-full border-2 border-[#EF4444] text-[#EF4444] flex items-center justify-center hover:bg-[#EF4444] hover:text-white hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all shrink-0 transform hover:-scale-x-110 active:scale-95"><XIcon className="w-8 h-8" /></button>
                        <button onClick={togglePlay} className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 hover:scale-105 transition-all shrink-0">{isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6 ml-1" />}</button>
                        <button onClick={() => handleAction(true)} className="w-16 h-16 rounded-full border-2 border-[#22C55E] text-[#22C55E] flex items-center justify-center hover:bg-[#22C55E] hover:text-white hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] transition-all shrink-0 transform hover:scale-110 active:scale-95"><HeartSolidIcon className="w-8 h-8" /></button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}

          {activeTab === 'statistics' && (
            <div className="flex-1 w-full max-w-4xl mx-auto mt-8 px-6 pb-12 relative z-10">
              <div className="bg-[#18181B] border border-[#27272A] rounded-3xl p-8 md:p-12 shadow-2xl">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center"><BarChartIcon className="w-8 h-8 mr-3 text-[#8B5CF6]" /> Your Musical Profile</h2>
                <p className="text-gray-400 mb-10">O motor usa sua Ritmo e Tonalidade para as próximas recomendações.</p>

                {savedTracks.length === 0 ? (
                  <div className="text-center py-20 bg-[#0F0F12] rounded-2xl border border-[#27272A] border-dashed"><BarChartIcon className="w-16 h-16 text-gray-700 mx-auto mb-4" /><p className="text-gray-400 text-lg">Sem dados suficientes.</p></div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="bg-[#0F0F12] p-6 rounded-2xl border border-[#27272A] text-center">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">BPM Médio</p>
                        <p className="text-3xl font-black text-[#A78BFA]">{getStats().avgBpm}</p>
                      </div>
                      <div className="bg-[#0F0F12] p-6 rounded-2xl border border-[#27272A] text-center">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Tom Favorito</p>
                        <p className="text-3xl font-black text-[#22C55E]">{getStats().topKey}</p>
                      </div>
                      <div className="bg-[#0F0F12] p-6 rounded-2xl border border-[#27272A] text-center">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Artistas Analisados</p>
                        <p className="text-3xl font-black text-white">{seenArtists.size}</p>
                      </div>
                      <div className="bg-[#0F0F12] p-6 rounded-2xl border border-[#27272A] text-center">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Curtidas</p>
                        <p className="text-3xl font-black text-white">{savedTracks.length}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-[#0F0F12] rounded-2xl p-6 border border-[#27272A]">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center"><span className="w-2 h-6 bg-[#22C55E] rounded-full mr-3"></span>Top Artists</h3>
                        <div className="space-y-4">{getStats().topArtists.map(([artist, count], i) => (<div key={artist} className="flex justify-between text-sm"><span className="text-gray-300">{i+1}. {artist}</span><span className="text-gray-500">{count}</span></div>))}</div>
                      </div>
                      <div className="bg-[#0F0F12] rounded-2xl p-6 border border-[#27272A]">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center"><span className="w-2 h-6 bg-[#8B5CF6] rounded-full mr-3"></span>Top Genres</h3>
                        <div className="space-y-4">{getStats().topGenres.map(([genre, count], i) => (<div key={genre} className="flex justify-between text-sm"><span className="text-gray-300">{i+1}. {genre}</span><span className="text-gray-500">{count}</span></div>))}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>

        {/* SIDEBAR COM A CAIXINHA DE TEXTO */}
        <aside className="w-[400px] border-l border-[#27272A] bg-[#121216] flex flex-col shadow-2xl relative z-20">
          <div className="p-6 border-b border-[#27272A] flex justify-between items-center bg-[#18181B]"><h3 className="font-bold text-lg text-white flex items-center"><HeartSolidIcon className="w-5 h-5 text-[#22C55E] mr-2" /> Saved Tracks <span className="ml-2 text-gray-500 text-sm font-normal">({savedTracks.length})</span></h3></div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {savedTracks.length === 0 ? (
              <div className="text-center py-12"><div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4"><HeartIcon className="w-8 h-8 text-gray-600" /></div><p className="text-gray-400 font-medium">Your queue is empty.</p></div>
            ) : (
              savedTracks.map((track) => (
                <div key={track.id} className="group flex items-center p-3 rounded-xl bg-[#18181B] border border-[#27272A] hover:border-[#8B5CF6]/50 transition-all">
                  <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-gray-800"><img src={track.cover} alt={track.title} className="w-full h-full object-cover" /></div>
                  <div className="ml-4 flex-1 min-w-0"><p className="text-white text-sm font-bold truncate">{track.title}</p><p className="text-gray-400 text-xs truncate mt-0.5">{track.artist}</p></div>
                  <button onClick={() => setSavedTracks(prev => prev.filter(t => t.id !== track.id))} className="p-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-[#EF4444] transition-all" title="Remove"><TrashIcon className="w-4 h-4" /></button>
                </div>
              ))
            )}
          </div>
          
          <div className="p-6 bg-[#18181B] border-t border-[#27272A] flex flex-col gap-3">
            {showExportBox && (
              <textarea 
                readOnly
                value={savedTracks.map(t => `${t.artist} - ${t.title}`).join('\n')}
                className="w-full h-32 bg-[#0F0F12] text-xs text-gray-300 font-mono p-3 rounded-xl border border-[#27272A] focus:outline-none focus:border-[#8B5CF6] resize-none custom-scrollbar"
              />
            )}
            <button id="export-btn" onClick={copyPlaylist} disabled={savedTracks.length === 0} className="w-full py-3.5 flex items-center justify-center space-x-2 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#27272A] text-white hover:bg-gray-700 hover:text-white border border-[#3F3F46]">
              <CopyIcon className="w-5 h-5" /><span>Copy Track List</span>
            </button>
          </div>
        </aside>
      </div>

      <footer className="flex-shrink-0 h-12 border-t border-[#27272A] bg-[#0F0F12] flex items-center justify-center z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.2)]">
        <div className="flex space-x-8 text-xs font-medium text-gray-500 font-mono tracking-wide">
          <span className="flex items-center"><kbd className="mr-2 px-2 py-1 rounded bg-[#27272A] text-gray-300">←</kbd> Reject</span>
          <span className="flex items-center"><kbd className="mr-2 px-2 py-1 rounded bg-[#27272A] text-gray-300">Space</kbd> Play/Pause</span>
          <span className="flex items-center"><kbd className="mr-2 px-2 py-1 rounded bg-[#27272A] text-[#22C55E]">→</kbd> Accept</span>
          <span className="flex items-center ml-8"><kbd className="mr-2 px-2 py-1 rounded bg-[#27272A] text-gray-300">R</kbd> Search</span>
        </div>
      </footer>
      <style dangerouslySetInnerHTML={{__html: `.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: #121216; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272A; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3F3F46; }`}} />
    </div>
  );
}