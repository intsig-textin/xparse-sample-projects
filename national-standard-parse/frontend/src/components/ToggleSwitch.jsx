import React from 'react'

export default function ToggleSwitch({ checked, onChange, label, title, disabled }) {
  const Btn = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-block h-5 w-9 rounded-full transition-colors focus:outline-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${checked ? 'bg-amber-400' : 'bg-slate-200'}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  )

  if (!label) return Btn

  return (
    <label
      className={`flex items-center gap-1.5 select-none group ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      }`}
      title={title}
    >
      <span className="text-[11px] text-slate-400 group-hover:text-slate-600 transition-colors">
        {label}
      </span>
      {Btn}
    </label>
  )
}
