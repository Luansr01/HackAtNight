// src/App.tsx
import React, { useState, useEffect, useCallback, useRef } from "react"
import { Play, Pause, X, Heart, RefreshCw, Music, Sparkles, Search } from "lucide-react"
import { Track, AudioFeatures, updateUserProfile, getNextRecommendations } from './lib/ml/engine'
import { fetchTracks } from './services/itunes'
import { OFFLINE_CATALOG } from './data/fallback'

// --- Megadicionário Local de Gêneros (Para garantir prioridade no Autocomplete) ---
const ALL_GENRES = [
  // Rock & Variantes
  "Rock", "Classic Rock", "Hard Rock", "Alternative Rock", "Indie Rock", "Punk", "Post-Punk", "Grunge", "Psychedelic Rock", "Math Rock", "Post-Rock",
  
  // Metal & Nichos Pesados
  "Metal", "Heavy Metal", "Thrash Metal", "Death Metal", "Black Metal", "Nu Metal", "Alternative Metal", "Post-Metal", "Doom Metal", "Sludge Metal", "Shoegaze", "Metalcore", "Deathcore",
  
  // Brasileiro & Regional
  "MPB", "Samba", "Bossa Nova", "Tropicália", "Folk Regional", "Música Gaúcha", "Sertanejo", "Forró", "Axé", "Funk Carioca", "Choro",
  
  // Pop
  "Pop", "Indie Pop", "Synthpop", "K-Pop", "J-Pop", "City Pop", "Dream Pop", "Electropop", "Hyperpop",
  
  // Hip Hop & R&B
  "Hip Hop", "Rap", "Trap", "R&B", "Soul", "Neo-Soul", "Funk", "Lo-Fi Hip Hop",
  
  // Eletrônica & Dance
  "Electronic", "Techno", "House", "Trance", "Dubstep", "Drum and Bass", "Synthwave", "Vaporwave", "Ambient", "IDM", "EDM",
  
  // Jazz, Blues & Clássica
  "Jazz", "Blues", "Smooth Jazz", "Bebop", "Classical", "Baroque", "Romantic", "Contemporary Classical",
  
  // Mundo & Alternativo
  "Reggae", "Ska", "Afrobeats", "Dancehall", "Country", "Folk", "Bluegrass", "Throat Singing", "Celtic", "Latin", "Reggaeton", "Salsa",
  
  // Mídias & Outros
  "Soundtrack", "Video Game Music", "Acoustic", "Vocal", "Experimental", "Industrial", "Goth"
];

// --- Gêneros para o Onboarding ---
const ONBOARDING_GENRES = [
  "Rock", "Pop", "Metal", "Hip Hop", "Electronic", 
  "Sertanejo", "MPB", "Música Gaúcha", "Jazz", "Classical", 
  "Samba", "Reggae", "Funk Carioca", "Blues", "Country"
];

const INITIAL_LIKED: Track[] = [];

function generateWaveform(seed: string): number[] {
  const bars: number[] = []
  let v = parseInt(seed.replace(/\D/g, '').substring(0, 5)) * 1664525 + 1013904223
  if (isNaN(v)) v = 123456789;
  for (let i = 0; i < 64; i++) {
    v = Math.imul(v, 1664525) + 1013904223
    const raw = (Math.abs(v) % 100) / 100
    const h = 10 + Math.round(raw * raw * 52 + raw * 10)
    bars.push(Math.min(72, Math.max(10, h)))
  }
  return bars
}

function formatTime(sec: number): string {
  return `0:${Math.floor(sec).toString().padStart(2, "0")}`
}

const DURATION = 30

export default function App() {
  // Controle de Telas
  const [appState, setAppState] = useState<"onboarding" | "main">("onboarding")
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [isLoadingMain, setIsLoadingMain] = useState(false)
  const [activeTab, setActiveTab] = useState<"discovery" | "stats">("discovery")
  
  // Estados do Motor de IA
  const [catalog, setCatalog] = useState<Track[]>([])
  const [queue, setQueue] = useState<Track[]>([])
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())
  const [userProfile, setUserProfile] = useState<AudioFeatures>([0.5, 0.5, 0.5, 0.5, 0.5])
  const [genreScores, setGenreScores] = useState<Record<string, number>>({})
  const [startTime, setStartTime] = useState<number>(Date.now())

  // Estados da UI
  const [seedInput, setSeedInput] = useState("")
  const [suggestions, setSuggestions] = useState<{type: 'genre'|'track', label: string, value: string}[]>([])
  const [liked, setLiked] = useState<Track[]>(INITIAL_LIKED)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null)
  const [playingLikedId, setPlayingLikedId] = useState<string | null>(null)
  const [seedFocused, setSeedFocused] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const current = queue[currentIdx] ?? null
  const waveform = current ? generateWaveform(current.id) : []
  const progressBarIdx = Math.floor((progress / DURATION) * waveform.length)

// ----------------------------------------------------------------------
  // MOTOR DE AUTOCOMPLETE (DEBOUNCE) - CORRIGIDO PARA APENAS MÚSICAS
  // ----------------------------------------------------------------------
  useEffect(() => {
    if (seedInput.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      // 1. Busca local por Gêneros (Garante que Gênero vem primeiro)
      const matchedGenres = ALL_GENRES
        .filter(g => g.toLowerCase().includes(seedInput.toLowerCase()))
        .slice(0, 2)
        .map(g => ({ type: 'genre' as const, label: `${g}`, value: g }));

      try {
        // 2. Busca na API do iTunes (O SEGREDO AQUI É O &entity=song)
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(seedInput)}&entity=song&limit=5`);
        const data = await res.json();
        
        // Formatação exata que você pediu: "Música - Artista"
        const matchedTracks = data.results.map((r: any) => ({
          type: 'track' as const,
          label: `${r.trackName} - ${r.artistName}`,
          value: `${r.artistName} ${r.trackName}` // Valor que será injetado no motor ao clicar
        }));

        // Junta Gêneros (topo) + Tracks e remove possíveis duplicatas visuais
        const uniqueSuggestions = Array.from(new Set([...matchedGenres, ...matchedTracks].map(s => s.label)))
          .map(label => [...matchedGenres, ...matchedTracks].find(s => s.label === label)!);

        setSuggestions(uniqueSuggestions.slice(0, 6));
      } catch (e) {
        setSuggestions(matchedGenres); // Se a API falhar, mostra pelo menos os gêneros locais
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [seedInput]);

  // Função para carregar múltiplas sementes (Onboarding)
  const startDiscovery = async () => {
    setIsLoadingMain(true);
    try {
      const fetches = selectedGenres.map(genre => fetchTracks(genre));
      const results = await Promise.all(fetches);
      let allTracks = results.flat().sort(() => Math.random() - 0.5);
      
      if (allTracks.length === 0) allTracks = OFFLINE_CATALOG;

      setCatalog(allTracks);
      setQueue(allTracks.slice(0, 5));
      setSeenIds(new Set([allTracks[0].id]));
      setCurrentIdx(0);
      setStartTime(Date.now());
      setAppState("main");
    } catch (error) {
      console.error("Erro ao carregar gêneros", error);
    } finally {
      setIsLoadingMain(false);
    }
  }

  // Função para injetar seed nova
const applySeed = async (term: string) => {
    if (!term.trim()) return;
    setSuggestions([]);
    setSeedInput("");
    setSeedFocused(false);
    
    let tracks = await fetchTracks(term);
    if (tracks.length === 0) return;
    
    // Perdoa o gênero: se ele estava negativo por dislikes, volta a ser positivo (busca explícita)
    setGenreScores(prev => ({ ...prev, [term]: Math.max(prev[term] || 0, 1) }));

    const newCatalog = [...tracks, ...catalog];
    setCatalog(newCatalog);
    
    setQueue(prev => {
      const pastHistory = prev.slice(0, currentIdx);
      return [...pastHistory, ...tracks];
    });
    
    setSeenIds(prev => new Set(prev).add(tracks[0].id));
    setStartTime(Date.now()); 
  }

  // Sincroniza Audio com Progresso
  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => {
      if (audioRef.current) setProgress(audioRef.current.currentTime)
    }, 250)
    return () => clearInterval(id)
  }, [isPlaying])

  useEffect(() => {
    setProgress(0)
    setIsPlaying(false)
    setStartTime(Date.now()) 
  }, [currentIdx])

  // Ações de IA (Match / Reject)
  const handleAction = useCallback((isLike: boolean) => {
    if (!current || swipeDir) return
    setSwipeDir(isLike ? "right" : "left")
    
    const reactionTimeMs = Date.now() - startTime;
    const newProfile = updateUserProfile(userProfile, current.features, isLike, reactionTimeMs);
    setUserProfile(newProfile);

    // Sistema de Punição/Recompensa do Gênero Atual
    setGenreScores(prev => {
      const currentScore = prev[current.genre] || 0;
      return { ...prev, [current.genre]: isLike ? currentScore + 1 : currentScore - 1 };
    });

    const newSeen = new Set(seenIds).add(current.id);
    setSeenIds(newSeen);

    if (isLike) {
      setLiked((prev) => {
        const already = prev.find((t) => t.id === current.id)
        return already ? prev : [current, ...prev]
      })
    }

    // Passa o genreScores atualizado para o motor puxar a fila corretamente
    const nextRecs = getNextRecommendations(newProfile, catalog, newSeen, genreScores, 5);

    setTimeout(() => {
      setQueue(prev => {
        const newItems = nextRecs.filter(r => !prev.find(p => p.id === r.id));
        return [...prev, ...newItems];
      });
      setSwipeDir(null)
      setCurrentIdx((i) => i + 1)
    }, 300)
  }, [current, swipeDir, startTime, userProfile, seenIds, catalog, genreScores])

  const handleReset = useCallback(() => {
    setAppState("onboarding");
    setSelectedGenres([]);
    setLiked([]);
    setSeenIds(new Set());
    setQueue([]);
    setCatalog([]);
  }, [])

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying])

  useEffect(() => {
    if (appState !== "main") return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === "ArrowLeft") handleAction(false)
      else if (e.key === "ArrowRight") handleAction(true)
      else if (e.key === " ") {
        e.preventDefault()
        togglePlay()
      } else if (e.key === "r" || e.key === "R") handleReset()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [appState, handleAction, togglePlay, handleReset])

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);
  };

  const cardTransform =
    swipeDir === "left" ? "translateX(-80px) rotate(-5deg)" : 
    swipeDir === "right" ? "translateX(80px) rotate(5deg)" : 
    "translateX(0) rotate(0deg)"

  // ----------------------------------------------------------------------
  // TELA DE ONBOARDING
  // ----------------------------------------------------------------------
  if (appState === "onboarding") {
    return (
      <div style={{ backgroundColor: "#0F0F12", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#FAFAFA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <div style={{ textAlign: "center", marginBottom: 48, maxWidth: 600 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, #7C3AED 0%, #22C55E 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 0 32px rgba(139,92,246,0.5)" }}>
            <Sparkles size={32} color="white" />
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, margin: "0 0 16px", letterSpacing: "-0.03em" }}>O que você curte ouvir?</h1>
          <p style={{ fontSize: 16, color: "#A1A1AA", lineHeight: 1.6 }}>Escolha pelo menos 3 gêneros para a nossa IA calibrar o seu radar musical. Nós faremos o resto.</p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, maxWidth: 800, marginBottom: 48 }}>
          {ONBOARDING_GENRES.map(genre => {
            const isSelected = selectedGenres.includes(genre);
            return (
              <button
                key={genre} onClick={() => toggleGenre(genre)}
                style={{
                  padding: "12px 24px", borderRadius: 30, fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                  backgroundColor: isSelected ? "rgba(139,92,246,0.15)" : "#18181B", border: isSelected ? "2px solid #8B5CF6" : "2px solid #27272A",
                  color: isSelected ? "#A78BFA" : "#FAFAFA", boxShadow: isSelected ? "0 0 20px rgba(139,92,246,0.3)" : "none", transform: isSelected ? "scale(1.05)" : "scale(1)"
                }}
              >
                {genre}
              </button>
            )
          })}
        </div>

        <button
          onClick={startDiscovery} disabled={selectedGenres.length < 3 || isLoadingMain}
          style={{
            padding: "16px 48px", borderRadius: 30, fontSize: 16, fontWeight: 800, cursor: selectedGenres.length >= 3 && !isLoadingMain ? "pointer" : "not-allowed",
            background: selectedGenres.length >= 3 ? "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)" : "#27272A",
            color: selectedGenres.length >= 3 ? "#fff" : "#71717A", border: "none", boxShadow: selectedGenres.length >= 3 ? "0 0 32px rgba(34,197,94,0.4)" : "none", transition: "all 0.3s"
          }}
        >
          {isLoadingMain ? "Sintetizando IA..." : `Construir meu Radar (${selectedGenres.length}/3)`}
        </button>
      </div>
    )
  }

  // ----------------------------------------------------------------------
  // TELA PRINCIPAL (APP)
  // ----------------------------------------------------------------------
  return (
    <div style={{ backgroundColor: "#0F0F12", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#FAFAFA", display: "flex", flexDirection: "column", fontSize: 14 }}>
      {current && (
        <audio ref={audioRef} src={current.previewUrl} autoPlay onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => handleAction(false)} />
      )}

      {/* HEADER */}
      <header style={{ borderBottom: "1px solid #27272A", backgroundColor: "#0F0F12", padding: "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg, #7C3AED 0%, #22C55E 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(139,92,246,0.4)" }}>
            <Music size={18} color="white" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>Tune<span style={{ color: "#8B5CF6" }}>Spur</span></span>
        </div>
        
        <nav style={{ display: "flex", gap: 3, backgroundColor: "#18181B", borderRadius: 11, padding: 4, border: "1px solid #27272A" }}>
          {[{ id: "discovery", label: "Discovery Core" }, { id: "stats", label: "My Taste" }].map((tab, i) => (
            <button
              key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", letterSpacing: "0.01em", transition: "all 0.15s",
                backgroundColor: activeTab === tab.id ? "#27272A" : "transparent", color: activeTab === tab.id ? "#FAFAFA" : "#71717A", boxShadow: activeTab === tab.id ? "0 1px 3px rgba(0,0,0,0.4)" : "none",
              }}
            >
              {i + 1}. {tab.label}
            </button>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "#18181B", border: "1px solid #27272A", borderRadius: 20, padding: "6px 14px" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#22C55E", boxShadow: "0 0 8px #22C55E, 0 0 16px rgba(34,197,94,0.4)", display: "block" }} />
          <span style={{ fontSize: 11.5, fontWeight: 500, color: "#A1A1AA" }}>IA Ativa</span>
        </div>
      </header>

      {/* BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        
        {activeTab === "stats" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <StatsView liked={liked} totalReviewed={currentIdx + liked.length} />
          </div>
        )}

        {activeTab === "discovery" && <main style={{ flex: "0 0 65%", display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 56px 24px", overflowY: "auto" }}>
          {current ? (
            <>
              <div style={{ width: "100%", maxWidth: 480, backgroundColor: "#18181B", border: "1px solid #27272A", borderRadius: 24, overflow: "hidden", transform: cardTransform, opacity: swipeDir ? 0 : 1, transition: "transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.22s ease", boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)", position: "relative" }}>
                
                <div style={{ position: "relative", margin: 18, marginBottom: 0, borderRadius: 14, overflow: "hidden", aspectRatio: "1", backgroundColor: "#27272A" }}>
                  <img src={current.cover} alt={current.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,15,18,0.85) 0%, rgba(15,15,18,0.1) 45%, transparent 100%)" }} />
                  <button onClick={togglePlay} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 60, height: 60, borderRadius: "50%", backgroundColor: "rgba(15,15,18,0.72)", backdropFilter: "blur(12px)", border: "1.5px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", opacity: isPlaying ? 0.7 : 1, transition: "opacity 0.2s, transform 0.2s", transform: isPlaying ? "scale(0.92)" : "scale(1)" }}>
                      {isPlaying ? <Pause color="white" fill="white" /> : <Play color="white" fill="white" className="ml-1" />}
                    </div>
                  </button>
                </div>

                <div style={{ padding: "16px 20px 6px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{current.title}</h2>
                      <p style={{ fontSize: 14, color: "#A1A1AA", margin: "4px 0 0", fontWeight: 500 }}>{current.artist}</p>
                    </div>
                    <span style={{ flexShrink: 0, padding: "4px 10px", borderRadius: 20, backgroundColor: "rgba(139,92,246,0.14)", border: "1px solid rgba(139,92,246,0.28)", color: "#A78BFA", fontSize: 10.5, fontWeight: 700 }}>
                      {current.genre}
                    </span>
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 1.5, height: 56, cursor: "pointer" }} onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const pct = (e.clientX - rect.left) / rect.width; if (audioRef.current) audioRef.current.currentTime = pct * DURATION; }}>
                      {waveform.map((h, i) => {
                        const isPast = i < progressBarIdx; const isCurrent = i === progressBarIdx;
                        return ( <div key={i} style={{ flex: 1, height: `${h}px`, borderRadius: 3, backgroundColor: isPast || isCurrent ? "#22C55E" : "#3F3F46", opacity: isPast ? 0.9 : isCurrent ? 1 : 0.45, boxShadow: isCurrent ? "0 0 8px rgba(34,197,94,0.8)" : "none", transition: "background-color 0.08s" }} /> )
                      })}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                      <span style={{ fontSize: 11, color: "#71717A", fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(progress)}</span>
                      <span style={{ fontSize: 11, color: "#3F3F46", fontFamily: "'JetBrains Mono', monospace" }}>0:30</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: "12px 20px 24px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
                    <ActionButton color="#EF4444" glowColor="239,68,68" size={64} onClick={() => handleAction(false)} icon={<X size={32}/>} />
                    <kbd style={kbdStyle}>[←] Reject</kbd>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
                    <ActionButton color="#71717A" glowColor="113,113,122" size={48} onClick={togglePlay} neutral icon={isPlaying ? <Pause size={20}/> : <Play size={20} className="ml-1"/>} />
                    <kbd style={kbdStyle}>[Space]</kbd>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
                    <ActionButton color="#22C55E" glowColor="34,197,94" size={64} onClick={() => handleAction(true)} icon={<Heart size={32} fill="#22C55E"/>} />
                    <kbd style={kbdStyle}>Accept [→]</kbd>
                  </div>
                </div>

                {/* AREA DE INJEÇÃO E AUTOCOMPLETE */}
                <div style={{ borderTop: "1px solid #27272A", padding: "14px 20px 18px", position: "relative" }}>
                  <label style={{ display: "block", fontSize: 9.5, fontWeight: 700, color: "#52525B", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 7 }}>
                    Explorar nova ramificação
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <input
                        value={seedInput}
                        onChange={(e) => setSeedInput(e.target.value)}
                        placeholder="Pesquisar gênero ou artista..."
                        onFocus={() => setSeedFocused(true)}
                        onBlur={() => setTimeout(() => setSeedFocused(false), 200)} // Delay para dar tempo do click registrar
                        onKeyDown={(e) => e.key === 'Enter' && applySeed(seedInput)}
                        style={{
                          width: "100%", backgroundColor: "#0F0F12",
                          border: `1px solid ${seedFocused ? "#8B5CF6" : "#3F3F46"}`,
                          borderRadius: 10, padding: "9px 12px 9px 12px",
                          fontSize: 13, fontFamily: "inherit", color: "#FAFAFA",
                          outline: "none", boxSizing: "border-box",
                        }}
                      />
                      
                      {/* DROPDOWN DE SUGESTÕES */}
                      {seedFocused && suggestions.length > 0 && (
                        <ul style={{
                          position: "absolute", bottom: "100%", left: 0, right: 0, marginBottom: "8px",
                          backgroundColor: "#18181B", border: "1px solid #27272A", borderRadius: "10px",
                          padding: "6px", margin: 0, listStyle: "none", boxShadow: "0 -8px 24px rgba(0,0,0,0.6)",
                          zIndex: 100, maxHeight: "200px", overflowY: "auto"
                        }}>
                          {suggestions.map((sugg, i) => (
                            <li 
                              key={i} 
                              onMouseDown={(e) => { e.preventDefault(); applySeed(sugg.value); }}
                              style={{
                                padding: "8px 12px", borderRadius: "6px", cursor: "pointer",
                                display: "flex", alignItems: "center", gap: "8px",
                                backgroundColor: "transparent", transition: "background-color 0.1s"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#27272A"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                              {sugg.type === 'genre' ? <Sparkles size={14} color="#A78BFA" /> : <Search size={14} color="#71717A" />}
                              <span style={{ fontSize: "12px", color: sugg.type === 'genre' ? "#A78BFA" : "#D4D4D8", fontWeight: sugg.type === 'genre' ? 700 : 500 }}>
                                {sugg.label} {sugg.type === 'genre' && <span style={{fontSize: "10px", opacity: 0.6}}>(Gênero)</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      onClick={() => applySeed(seedInput)}
                      style={{
                        padding: "9px 14px", background: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                        border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700,
                        color: "#fff", cursor: "pointer", boxShadow: "0 0 16px rgba(139,92,246,0.35)",
                      }}
                    >
                      Injetar 
                    </button>
                  </div>
                </div>
              </div>
              <p style={{ marginTop: 14, fontSize: 11, color: "#3F3F46", fontFamily: "'JetBrains Mono', monospace" }}>
                {currentIdx + 1} / {queue.length}
              </p>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "64px 24px" }}>
              <RefreshCw size={52} color="#52525B" className="mx-auto mb-4" />
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Fim da Fila</h3>
              <p style={{ color: "#52525B", marginBottom: 28, fontSize: 14, lineHeight: 1.6 }}>Você esgotou os horizontes atuais do seu perfil.</p>
              <button onClick={handleReset} style={{ padding: "12px 32px", background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                [R] Recalibrar IA
              </button>
            </div>
          )}
        </main>}

        {/* SIDEBAR */}
        {activeTab === "discovery" &&
        <aside style={{ flex: "0 0 35%", borderLeft: "1px solid #27272A", display: "flex", flexDirection: "column", backgroundColor: "#0C0C0F", minHeight: 0 }}>
          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #27272A" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Músicas Salvas</h3>
              <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 20, backgroundColor: "rgba(139,92,246,0.15)", color: "#A78BFA" }}>{liked.length}</span>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
            {liked.map((track) => (
              <LikedTrackRow key={track.id} track={track} isPlaying={playingLikedId === track.id} onTogglePlay={() => setPlayingLikedId(track.id)} onRemove={() => setLiked((prev) => prev.filter((t) => t.id !== track.id))} />
            ))}
          </div>
        </aside>}
      </div>

      <footer style={{ borderTop: "1px solid #1C1C1F", backgroundColor: "#09090B", padding: "9px 40px", display: "flex", alignItems: "center", justifyContent: "center", gap: 36, flexShrink: 0 }}>
        {[{ key: "←", label: "Reject", color: "#EF4444" }, { key: "→", label: "Accept", color: "#22C55E" }, { key: "Space", label: "Play / Pause", color: "#A1A1AA" }, { key: "R", label: "Reset Seed", color: "#8B5CF6" }].map(({ key, label }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <kbd style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, padding: "2px 8px", borderRadius: 5, backgroundColor: "#18181B", border: "1px solid #2E2E32", color: "#71717A" }}>{key}</kbd>
            <span style={{ fontSize: 11, color: "#3F3F46" }}>{label}</span>
          </div>
        ))}
      </footer>
    </div>
  )
}

// ----------------------------------------------------------------------
// SUB-COMPONENTS E STATS VIEW
// ----------------------------------------------------------------------
const kbdStyle: React.CSSProperties = { fontSize: 10, color: "#52525B", letterSpacing: "0.04em", fontFamily: "'JetBrains Mono', monospace" }

function ActionButton({ color, glowColor, size, onClick, icon, neutral = false }: any) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ width: size, height: size, borderRadius: "50%", backgroundColor: neutral ? (hovered ? "#27272A" : "#1E1E21") : (hovered ? `rgba(${glowColor},0.22)` : `rgba(${glowColor},0.1)`), border: neutral ? `1.5px solid ${hovered ? "#3F3F46" : "#27272A"}` : `1.5px solid rgba(${glowColor},${hovered ? 0.5 : 0.28})`, color: color, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", transform: hovered ? "scale(1.06)" : "scale(1)", boxShadow: hovered && !neutral ? `0 0 22px rgba(${glowColor},0.4)` : "none" }}>
      {icon}
    </button>
  )
}

function LikedTrackRow({ track, isPlaying, onTogglePlay, onRemove }: any) {
  const [hovered, setHovered] = useState(false)
  const [delHovered, setDelHovered] = useState(false)
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 24px", backgroundColor: hovered ? "#18181B" : "transparent", transition: "background-color 0.1s" }}>
      <div style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", backgroundColor: "#27272A", position: "relative" }}>
        <img src={track.cover} alt={track.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12.5, fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isPlaying ? "#22C55E" : "#FAFAFA" }}>{track.title}</p>
        <p style={{ fontSize: 11, color: "#71717A", margin: "2px 0 3px" }}>{track.artist}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={onRemove} onMouseEnter={() => setDelHovered(true)} onMouseLeave={() => setDelHovered(false)} style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: delHovered ? "rgba(239,68,68,0.1)" : "transparent", color: delHovered ? "#EF4444" : "#52525B", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

function StatsView({ liked, totalReviewed }: { liked: Track[]; totalReviewed: number }) {
  const allLiked = liked.map((t) => ({ artist: t.artist, genre: t.genre?.split(" / ")[0] || "Unknown", liked: true }));
  const allReviewed = totalReviewed;
  const genreMap: Record<string, number> = {}
  for (const h of allLiked) genreMap[h.genre] = (genreMap[h.genre] ?? 0) + 1
  const genres = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 8)
  
  return (
    <div style={{ padding: "40px 56px", maxWidth: 1100, margin: "0 auto" }}>
      <h2 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 36px" }}>My Taste Profile</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <div style={{ backgroundColor: "#18181B", border: "1px solid #27272A", borderRadius: 16, padding: "20px 24px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#52525B", letterSpacing: "0.08em", textTransform: "uppercase" }}>Tracks Reviewed</p>
          <p style={{ fontSize: 32, fontWeight: 800, color: "#A1A1AA", margin: 0 }}>{allReviewed}</p>
        </div>
        <div style={{ backgroundColor: "#18181B", border: "1px solid #27272A", borderRadius: 16, padding: "20px 24px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#52525B", letterSpacing: "0.08em", textTransform: "uppercase" }}>Tracks Liked</p>
          <p style={{ fontSize: 32, fontWeight: 800, color: "#22C55E", margin: 0 }}>{allLiked.length}</p>
        </div>
      </div>
      
      <div style={{ backgroundColor: "#18181B", border: "1px solid #27272A", borderRadius: 20, padding: "24px 28px" }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 20px" }}>Top Genres</h3>
        {genres.length === 0 && <p style={{ color: "#71717A" }}>Dê likes nas músicas para gerar suas estatísticas.</p>}
        {genres.map(([genre, count], i) => (
          <div key={genre} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#D4D4D8" }}>{genre}</span>
              <span style={{ fontSize: 11, color: "#52525B" }}>{count} liked</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}