import { ChevronDown } from 'lucide-react';

export default function ListeDeroulante({
  label,
  options,
  valeur,
  onChange,
  erreur,
  placeholder,
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-kotrou-gris">{label}</label>
      )}
      <div className="relative">
        <select
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          className={`
            w-full h-12 px-3 pr-10 rounded-lg border text-base appearance-none bg-white transition-colors
            focus:outline-none focus:ring-2 focus:ring-kotrou-orange focus:border-transparent
            ${erreur ? 'border-kotrou-rouge' : 'border-gray-300'}
            ${!valeur ? 'text-gray-400' : 'text-kotrou-gris'}
          `}
        >
          {placeholder && (
            <option value="" disabled>{placeholder}</option>
          )}
          {options.map((opt) => (
            <option key={opt.valeur} value={opt.valeur}>
              {opt.libelle}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>
      {erreur && (
        <p className="text-xs text-kotrou-rouge">{erreur}</p>
      )}
    </div>
  );
}
