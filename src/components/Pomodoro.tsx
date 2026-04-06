import { useState, useEffect, useRef, useCallback } from 'react';

type PomodoroPhase = 'work' | 'break' | 'longBreak';

const DEFAULTS = {
  work: 25 * 60,
  break: 5 * 60,
  longBreak: 15 * 60,
};

export function Pomodoro({ iconOnly = false }: { iconOnly?: boolean }) {
  const [collapsed, setCollapsed] = useState(true);
  const [durations, setDurations] = useState(DEFAULTS);
  const [phase, setPhase] = useState<PomodoroPhase>('work');
  const [timeLeft, setTimeLeft] = useState(DEFAULTS.work);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback(() => {
    try {
      const ctx = audioRef.current || new AudioContext();
      audioRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.3);
      }, 250);
    } catch {}
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            playBeep();
            setRunning(false);
            // Auto advance phase
            if (phase === 'work') {
              const newSessions = sessions + 1;
              setSessions(newSessions);
              if (newSessions % 4 === 0) {
                setPhase('longBreak');
                return durations.longBreak;
              } else {
                setPhase('break');
                return durations.break;
              }
            } else {
              setPhase('work');
              return durations.work;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, phase, sessions, durations, playBeep]);

  function reset() {
    setRunning(false);
    setTimeLeft(durations[phase]);
  }

  function switchPhase(p: PomodoroPhase) {
    setRunning(false);
    setPhase(p);
    setTimeLeft(durations[p]);
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = 1 - timeLeft / durations[phase];

  const phaseLabel = phase === 'work' ? 'Foco' : phase === 'break' ? 'Pausa' : 'Pausa longa';
  const phaseColor = phase === 'work' ? '#F24B0F' : '#15BFAE';

  if (iconOnly) {
    return (
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors relative ${
          running ? 'text-[#F24B0F]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        title={running ? `Pomodoro ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : 'Pomodoro'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
        </svg>
        {running && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#F24B0F] rounded-full" />
        )}
      </button>
    );
  }

  return (
    <div className="border-t border-gray-100 px-3 py-2">
      {/* Header - always visible */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-base text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
        </svg>
        <span className="flex-1 text-left">Pomodoro</span>
        {running && (
          <span className="text-xs font-mono" style={{ color: phaseColor }}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
        )}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="#9ca3af"
          className={`transition-transform ${collapsed ? '' : 'rotate-90'}`}
        >
          <path d="M8 5l8 7-8 7z" />
        </svg>
      </button>

      {!collapsed && <>
      {/* Phase tabs */}
      <div className="flex gap-1 mb-2 mt-2">
        {(['work', 'break', 'longBreak'] as PomodoroPhase[]).map((p) => (
          <button
            key={p}
            onClick={() => switchPhase(p)}
            className={`flex-1 text-[10px] py-1 rounded transition-colors ${
              phase === p ? 'bg-gray-100 text-gray-700 font-medium' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {p === 'work' ? 'Foco' : p === 'break' ? 'Pausa' : 'Longa'}
          </button>
        ))}
      </div>

      {/* Timer display */}
      <div className="relative flex flex-col items-center py-2">
        {/* Progress ring */}
        <svg width="90" height="90" className="mb-1">
          <circle cx="45" cy="45" r="38" fill="none" stroke="#f3f4f6" strokeWidth="4" />
          <circle
            cx="45" cy="45" r="38"
            fill="none"
            stroke={phaseColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 38}`}
            strokeDashoffset={`${2 * Math.PI * 38 * (1 - progress)}`}
            transform="rotate(-90 45 45)"
            className="transition-all duration-1000"
          />
          <text x="45" y="43" textAnchor="middle" dominantBaseline="middle" fill="#1f2937" fontSize="22" fontWeight="600" fontFamily="monospace">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </text>
          <text x="45" y="58" textAnchor="middle" fill={phaseColor} fontSize="8" fontWeight="500">
            {phaseLabel}
          </text>
        </svg>

        {/* Controls */}
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => setRunning(!running)}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ backgroundColor: phaseColor + '22', color: phaseColor }}
          >
            {running ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            onClick={reset}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-300 hover:bg-gray-100 transition-colors"
            title="Resetar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
            </svg>
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-300 hover:bg-gray-100 transition-colors"
            title="Configurar tempos"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        </div>

        {/* Session count */}
        <div className="flex gap-1 mt-2">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full transition-colors"
              style={{ backgroundColor: i < (sessions % 4) ? phaseColor : '#e5e7eb' }}
            />
          ))}
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="mt-2 space-y-2 bg-gray-100 rounded-lg p-2">
          {([
            { key: 'work' as const, label: 'Foco' },
            { key: 'break' as const, label: 'Pausa' },
            { key: 'longBreak' as const, label: 'Pausa longa' },
          ]).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">{label}</span>
              <div className="flex items-center gap-1">
                <button
                  className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 bg-gray-100 rounded text-xs"
                  onClick={() => {
                    const newVal = Math.max(60, durations[key] - 300);
                    setDurations({ ...durations, [key]: newVal });
                    if (phase === key) setTimeLeft(newVal);
                  }}
                >
                  -
                </button>
                <span className="text-xs text-gray-700 w-8 text-center">{Math.floor(durations[key] / 60)}m</span>
                <button
                  className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 bg-gray-100 rounded text-xs"
                  onClick={() => {
                    const newVal = durations[key] + 300;
                    setDurations({ ...durations, [key]: newVal });
                    if (phase === key) setTimeLeft(newVal);
                  }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </>}
    </div>
  );
}
