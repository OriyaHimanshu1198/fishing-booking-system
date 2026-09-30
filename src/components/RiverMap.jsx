import React, { useState } from 'react'
import { Waves, Fish, Compass, Info, CheckCircle2, Lock, Sparkles, MapPin } from 'lucide-react'

// Rich beat metadata for Highland Angling
export const BEAT_DETAILS = {
  'Beat 1': {
    name: 'Beat 1: Upper Run',
    type: 'Fast Water & Gravel Beds',
    depth: '1.2m – 1.8m',
    species: 'Atlantic Salmon, Brown Trout',
    wading: 'Moderate wading required (studded soles)',
    desc: 'Classic fast-flowing riffles and shallow gravel runs where salmon pause on their upstream migration.',
    color: '#0284c7',
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
    color: '#0369a1',
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
    color: '#0891b2',
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
    color: '#059669',
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
    color: '#0d9488',
    icon: '🌊',
    difficulty: 'Intermediate'
  },
  'Loch': {
    name: 'The Loch: Stillwater Haven',
    type: 'Open Water & Bay Shallows',
    depth: '4.0m – 8.5m',
    species: 'Ferox Trout, Brown Trout, Pike',
    wading: 'Boat & jetty casting only',
    desc: 'Pristine mountain loch with drift boat access and sheltered reed bays. Excellent throughout the season.',
    color: '#7c3aed',
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
    <div className="river-map-container bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shadow-inner">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                River & Beat Interactive Map
              </h3>
              {interactive && activeDayLabel && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Selecting for: {activeDayLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              Click or hover over any beat along the river to view pool characteristics, target species, and depths.
            </p>
          </div>
        </div>

        {interactive && (
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm"></span> Available
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Booked
            </span>
          </div>
        )}
      </div>

      {/* Visual River Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* River Diagram */}
        <div className="lg:col-span-7 bg-slate-950/70 rounded-2xl p-4 sm:p-5 border border-slate-800 relative">
          <div className="text-[11px] font-black tracking-wider text-slate-300 uppercase mb-3.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">⛰️ Upstream Source</span>
            <span className="flex items-center gap-1.5">Estuary & Loch 🌊</span>
          </div>

          <div className="space-y-3 relative">
            {/* Water flow line background */}
            <div className="absolute left-7 top-4 bottom-4 w-1 bg-gradient-to-b from-blue-400 via-teal-400 to-indigo-500 opacity-40 rounded-full"></div>

            {beatsList.map((beatKey) => {
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
                    } else if (!interactive && onSelectBeat) {
                      onSelectBeat(beatKey)
                    }
                  }}
                  className={`
                    relative group flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer
                    ${interactive && isAvailable ? 'cursor-pointer' : interactive ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                    ${isSelected
                      ? 'bg-emerald-950/80 border-emerald-500 shadow-lg ring-2 ring-emerald-500/30'
                      : isHovered
                        ? 'bg-slate-800 border-teal-400 shadow-md translate-x-1'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }
                  `}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Beat icon indicator */}
                    <div className={`
                      w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-sm transition-colors
                      ${isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-white border border-slate-700'
                      }
                    `}>
                      {info.icon}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white group-hover:text-emerald-300 transition-colors">
                          {beatKey}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
                          {info.type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 flex items-center gap-2 mt-1 font-medium">
                        <span className="font-semibold text-white">Depth: {info.depth}</span>
                        <span>•</span>
                        <span className="text-slate-200">{info.species}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Status Badge */}
                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-600 text-white shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                      </span>
                    ) : interactive && !isAvailable ? (
                      <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-rose-950/60 text-rose-300 border border-rose-900/60">
                        <Lock className="w-3 h-3" /> Booked
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-300 group-hover:text-emerald-300 flex items-center gap-1">
                        View Details <Info className="w-3.5 h-3.5" />
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
          <div className="lg:col-span-5 bg-slate-950/80 rounded-2xl p-6 border border-slate-800 flex flex-col justify-between shadow-xl text-white">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">{details.icon}</span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {details.difficulty}
                </span>
              </div>

              <h4 className="text-xl font-extrabold text-white mb-1 tracking-tight">
                {details.name}
              </h4>
              <p className="text-xs font-bold text-emerald-400 mb-3 uppercase tracking-wider">
                {details.type}
              </p>
              <p className="text-xs leading-relaxed text-slate-200 mb-5 bg-slate-900/90 p-4 rounded-xl border border-slate-800 font-medium">
                {details.desc}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 shadow-sm">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Typical Depth</span>
                  <span className="font-extrabold text-white text-sm mt-0.5 block">{details.depth}</span>
                </div>
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 shadow-sm">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Species</span>
                  <span className="font-extrabold text-white text-xs mt-0.5 block truncate">{details.species}</span>
                </div>
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 shadow-sm col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Wading Conditions</span>
                  <span className="font-bold text-emerald-300 text-xs mt-0.5 block">{details.wading}</span>
                </div>
              </div>
            </div>

            {interactive && (
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">Click any beat row to assign</span>
                {selectedBeat && (
                  <span className="text-emerald-300 font-extrabold flex items-center gap-1">
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
