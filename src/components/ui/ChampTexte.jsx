export default function ChampTexte({
  label,
  placeholder,
  aide,
  erreur,
  type = 'text',
  valeur,
  onChange,
  obligatoire,
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-kotrou-gris">
        {label}
        {obligatoire && <span className="text-kotrou-rouge ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={obligatoire}
        className={`
          w-full h-12 px-3 rounded-lg border text-base transition-colors
          focus:outline-none focus:ring-2 focus:ring-kotrou-orange focus:border-transparent
          ${erreur ? 'border-kotrou-rouge' : 'border-gray-300'}
        `}
      />
      {aide && !erreur && (
        <p className="text-xs text-gray-400">{aide}</p>
      )}
      {erreur && (
        <p className="text-xs text-kotrou-rouge">{erreur}</p>
      )}
    </div>
  );
}
