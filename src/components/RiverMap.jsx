import React, { useState } from 'react'
import { Waves, Fish, Compass, Info, CheckCircle2, Lock, Sparkles } from 'lucide-react'

// Rich beat metadata for Highland Angling
export const BEAT_DETAILS = {
  'Beat 1': {
    name: 'Beat 1: Upper Run',
    type: 'Fast Water & Gravel Beds',
    depth: '1.2m – 1.8m',
    species: 'Atlantic Salmon, Brown Trout',
    wading: 'Moderate wading required',
    desc: 'Classic fast-flowing riffles and shallow gravel runs where salmon pause on their upstream migration.',
    color: '#3b82f6',
    icon: '🌊',
    difficulty: 'Intermediate'
  },
  'Beat 2': {
    name: 'Beat 2: The Gorge Pool',
    type: 'Deep Holding Pool',
    depth: '3.0m – 4.2m',
    species: 'Salmon, Large Sea Trout',
    wading: 'Bank fishing & deep wading',
    desc: 'Sheltered canyon pool with deep bedrock ledges. Legendary for holding multi-sea-winter salmon.',
    color: '#0ea5e9',
    icon: '🏞️',
    difficulty: 'Advanced'
  },
  'Beat 3': {
    name: 'Beat 3: Middle Rapids',
    type: 'Oxygenated Glides',
    depth: '1.5m – 2.5m',
    species: 'Sea Trout, Grilse, Salmon',
    wading: 'Easy wading with gravel bars',
    desc: 'Wide, rhythmic pools interspersed with bubbly rapids. Exceptional for evening dry fly fishing.',
    color: '#06b6d4',
    icon: '⚡',
    difficulty: 'All Levels'
  },
  'Beat 4': {
    name: 'Beat 4: Meadow Stretch',
    type: 'Gentle Meanders',
    depth: '1.8m – 2.2m',
    species: 'Wild Brown Trout, Salmon',
    wading: 'Grass bank access, very easy',
    desc: 'Scenic open meadow stretch with gentle water flow. Ideal for spey casting and relaxed fishing.',
    color: '#10b981',
    icon: '🌾',
    difficulty: 'Beginner Friendly'
  },
  'Beat 5': {
    name: 'Beat 5: Lower Estuary',
    type: 'Tidal Junction Pool',
    depth: '2.5m – 3.2m',
    species: 'Fresh-run Salmon, Sea Trout',
    wading: 'Tidal awareness needed',
    desc: 'First pool above the tide line. Fish entering on high tides hit this beat first with peak silver shine.',
    color: '#14b8a6',
    icon: '🌊',
    difficulty: 'Intermediate'
  },
  'Loch': {
    name: 'The Loch: Stillwater Haven',
    type: 'Open Water & Bay Shallows',
    depth: '4.0m – 8.5m',
    species: 'Ferox Trout, Brown Trout, Pike',
    wading: 'Boat & jetty casting',
    desc: 'Pristine mountain loch with drift boat access and sheltered reed bays. Excellent throughout the season.',
    color: '#8b5cf6',
    icon: '⛵',
    difficulty: 'All Levels'
  }
}

export default function RiverMap({
  selectedBeat,
  onSelectBeat,
  availableBeats = [],
  activeDayLabel = '',
  interactive = false,
  showDetailsCard = true
}) {
  const [hoveredBeat, setHoveredBeat] = useState(null)
  const activeDetailBeat = hoveredBeat || selectedBeat || 'Beat 1'
  const details = BEAT_DETAILS[activeDetailBeat] || BEAT_DETAILS['Beat 1']

  const beatsList = ['Beat 1', 'Beat 2', 'Beat 3', 'Beat 4', 'Beat 5', 'Loch']

  return (
    <div className="river-map-container bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 border border-slate-700 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-700/70">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              River & Beat Interactive Map
              {interactive && activeDayLabel && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Selecting for: {activeDayLabel}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">Hover or click a beat along the river to view pool characteristics & select</p>
          </div>
        </div>

        {interactive && (
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span> Available
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Booked
            </span>
          </div>
        )}
      </div>

      {/* Visual River Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* River Diagram */}
        <div className="lg:col-span-7 bg-slate-950/60 rounded-xl p-4 border border-slate-800 relative">
          <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-3 flex items-center justify-between">
            <span>⛰️ Upstream Mountain Source</span>
            <span>Estuary & Ocean 🌊</span>
          </div>

          <div className="space-y-2.5 relative">
            {/* Water flow line background */}
            <div className="absolute left-6 top-4 bottom-4 w-1 bg-gradient-to-b from-blue-400 via-cyan-400 to-indigo-500 opacity-30 rounded-full"></div>

            {beatsList.map((beatKey, index) => {
              const info = BEAT_DETAILS[beatKey]
              const isAvailable = interactive ? availableBeats.includes(beatKey) : true
              const isSelected = selectedBeat === beatKey
              const isHovered = hoveredBeat === beatKey

              return (
                <div
                  key={beatKey}
                  onMouseEnter={() => setHoveredBeat(beatKey)}
                  onMouseLeave={() => setHoveredBeat(null)}
                  onClick={() => {
                    if (interactive && isAvailable && onSelectBeat) {
                      onSelectBeat(beatKey)
                    }
                  }}
                  className={`
                    relative group flex items-center justify-between p-3 rounded-xl border transition-all duration-200
                    ${interactive && isAvailable ? 'cursor-pointer' : interactive ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                    ${isSelected
                      ? 'bg-emerald-950/70 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400'
                      : isHovered
                        ? 'bg-slate-800/90 border-cyan-400/80 shadow-md translate-x-1'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Beat icon indicator */}
                    <div className={`
                      w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shadow-inner transition-colors
                      ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'}
                    `}>
                      {info.icon}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white group-hover:text-cyan-300 transition-colors">
                          {beatKey}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {info.type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Depth: {info.depth}</span>
                        <span>•</span>
                        <span className="text-slate-300">{info.species}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Status Badge */}
                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500 text-white shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                      </span>
                    ) : interactive && !isAvailable ? (
                      <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        <Lock className="w-3 h-3" /> Booked
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400 group-hover:text-cyan-400 flex items-center gap-1">
                        View <Info className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Beat Details Card */}
        {showDetailsCard && (
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-950 rounded-xl p-5 border border-slate-800 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{details.icon}</span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {details.difficulty}
                </span>
              </div>

              <h4 className="text-lg font-bold text-white mb-1">{details.name}</h4>
              <p className="text-xs font-medium text-cyan-400 mb-3">{details.type}</p>
              <p className="text-xs leading-relaxed text-slate-300 mb-4 bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                {details.desc}
              </p>

              <div className="grid grid-cols-2 gap-2.5 mb-4 text-xs">
                <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Pool Depth</span>
                  <span className="font-semibold text-white">{details.depth}</span>
                </div>
                <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Target Species</span>
                  <span className="font-semibold text-white">{details.species}</span>
                </div>
                <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Wading Conditions</span>
                  <span className="font-semibold text-emerald-400">{details.wading}</span>
                </div>
              </div>
            </div>

            {interactive && (
              <div className="mt-2 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Click beat row to assign</span>
                {selectedBeat && (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Assigned: {selectedBeat}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
