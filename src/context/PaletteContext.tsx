import React, { createContext, useContext, useState, useEffect } from 'react';

export interface PaletteTheme {
  id: string;
  name: string;
  tagline: string;
  bgCanvas: string;
  heroGradient: string;
  primaryColor: string;
  accentColor: string;
  borderAccent: string;
  previewColors: string[];
}

export const PALETTES: PaletteTheme[] = [
  {
    id: 'forest',
    name: 'Forest Evergreen (Default)',
    tagline: 'Classic MindWork botanical theme with deep forest green and warm cream canvas',
    bgCanvas: '#FAF7F0',
    heroGradient: 'from-[#2D4A36] via-[#355840] to-[#436A4F]',
    primaryColor: '#2D4A36',
    accentColor: '#588157',
    borderAccent: '#A3B18A',
    previewColors: ['#FAF7F0', '#2D4A36', '#588157', '#A3B18A'],
  },
  {
    id: 'sage',
    name: 'Meadow Sage & Linen',
    tagline: 'Calm restorative sage with fresh meadow greens and soft linen canvas',
    bgCanvas: '#F3F6F3',
    heroGradient: 'from-[#2A4D38] via-[#3E6B4E] to-[#558564]',
    primaryColor: '#3E6B4E',
    accentColor: '#6B9080',
    borderAccent: '#8FAF9A',
    previewColors: ['#F3F6F3', '#2A4D38', '#3E6B4E', '#8FAF9A'],
  },
  {
    id: 'pine',
    name: 'Nordic Pine & Slate',
    tagline: 'Subtle Nordic timber tones with deep spruce pine and cool mist',
    bgCanvas: '#F0F4F2',
    heroGradient: 'from-[#1B3A31] via-[#2A5245] to-[#3E6E5E]',
    primaryColor: '#1B3A31',
    accentColor: '#4A6B63',
    borderAccent: '#7DA397',
    previewColors: ['#F0F4F2', '#1B3A31', '#2A5245', '#7DA397'],
  },
  {
    id: 'olive',
    name: 'Warm Olive & Sand',
    tagline: 'Earth-grounded Mediterranean olive tones with sun-warmed sand',
    bgCanvas: '#FBF8F1',
    heroGradient: 'from-[#3E4720] via-[#525E2B] to-[#687739]',
    primaryColor: '#525E2B',
    accentColor: '#606C38',
    borderAccent: '#A4AC7C',
    previewColors: ['#FBF8F1', '#3E4720', '#525E2B', '#A4AC7C'],
  },
];

interface PaletteContextType {
  activePalette: PaletteTheme;
  setPaletteById: (id: string) => void;
  palettes: PaletteTheme[];
  resetToDefault: () => void;
}

const PaletteContext = createContext<PaletteContextType>({
  activePalette: PALETTES[0],
  setPaletteById: () => {},
  palettes: PALETTES,
  resetToDefault: () => {},
});

export const PaletteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeId, setActiveId] = useState<string>(() => {
    try {
      return localStorage.getItem('mindwork_active_palette') || 'forest';
    } catch {
      return 'forest';
    }
  });

  const activePalette = PALETTES.find((p) => p.id === activeId) || PALETTES[0];

  const setPaletteById = (id: string) => {
    const exists = PALETTES.some((p) => p.id === id);
    const nextId = exists ? id : 'forest';
    setActiveId(nextId);
    try {
      localStorage.setItem('mindwork_active_palette', nextId);
    } catch {
      // ignore storage error
    }
  };

  const resetToDefault = () => setPaletteById('forest');

  useEffect(() => {
    // Dynamically update CSS custom properties and document dataset
    const root = document.documentElement;
    root.dataset.palette = activePalette.id;
    root.style.setProperty('--mindwork-bg', activePalette.bgCanvas);
    root.style.setProperty('--mindwork-primary', activePalette.primaryColor);
    root.style.setProperty('--mindwork-accent', activePalette.accentColor);
    document.body.style.backgroundColor = activePalette.bgCanvas;
  }, [activePalette]);

  return (
    <PaletteContext.Provider
      value={{
        activePalette,
        setPaletteById,
        palettes: PALETTES,
        resetToDefault,
      }}
    >
      {children}
    </PaletteContext.Provider>
  );
};

export const usePalette = () => useContext(PaletteContext);
