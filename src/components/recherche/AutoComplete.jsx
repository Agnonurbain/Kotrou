import { useState, useEffect, useRef, useCallback } from 'react';
import { X, MapPin, Search, Bus } from 'lucide-react';
import { QUARTIERS } from '../../data/quartiers';
import { COMMUNES } from '../../data/communes';
import { geocoder } from '../../lib/geocodeur';
import { supabase } from '../../supabase';

const TOUTES_LOCALISATIONS = [];

for (const [communeId, quartiers] of Object.entries(QUARTIERS)) {
  const commune = COMMUNES.find((c) => c.id === communeId);
  if (!commune) continue;
  for (const q of quartiers) {
    TOUTES_LOCALISATIONS.push({
      nom: `${q}, ${commune.nom}`,
      lat: commune.centre.lat + (Math.random() - 0.5) * 0.02,
      lng: commune.centre.lng + (Math.random() - 0.5) * 0.02,
      source: 'quartier',
    });
  }
  TOUTES_LOCALISATIONS.push({
    nom: commune.nom,
    lat: commune.centre.lat,
    lng: commune.centre.lng,
    source: 'commune',
  });
}

function cherchLocale(texte) {
  const t = texte.toLowerCase();
  return TOUTES_LOCALISATIONS.filter((l) => l.nom.toLowerCase().includes(t)).slice(0, 3);
}

async function chercherGares(texte) {
  if (!navigator.onLine) return [];
  try {
    const { data } = await supabase
      .from('lignes')
      .select('depart_gare, depart_coords, depart_commune, type')
      .ilike('depart_gare', `%${texte}%`)
      .limit(3);
    if (!data) return [];
    return data.map((g) => ({
      nom: `${g.depart_gare} — ${g.type === 'gbaka' ? 'Gbaka' : g.type === 'woro' ? 'Wôrô' : 'SOTRA'}`,
      lat: g.depart_coords?.coordinates?.[1] ?? null,
      lng: g.depart_coords?.coordinates?.[0] ?? null,
      source: 'gare',
      type: g.type,
    })).filter((g) => g.lat != null);
  } catch {
    return [];
  }
}

export default function AutoComplete({ placeholder, onSelection, type }) {
  const [texte, setTexte] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [ouvert, setOuvert] = useState(false);
  const [chargementNom, setChargementNom] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const rechercher = useCallback(async (val) => {
    if (val.length < 2) {
      setSuggestions([]);
      return;
    }

    const locales = cherchLocale(val);
    const gares = await chercherGares(val);
    const combinees = [...gares, ...locales].slice(0, 5);
    setSuggestions(combinees);

    if (!navigator.onLine) return;

    setChargementNom(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const coords = await geocoder(val);
      setChargementNom(false);
      if (coords) {
        setSuggestions((prev) => {
          const existants = prev.filter((s) => s.source !== 'nominatim');
          return [...existants, { nom: val, lat: coords.lat, lng: coords.lng, source: 'nominatim' }].slice(0, 5);
        });
      }
    }, 500);
  }, []);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const choisir = (suggestion) => {
    setTexte(suggestion.nom);
    setOuvert(false);
    setSuggestions([]);
    onSelection({ nom: suggestion.nom, lat: suggestion.lat, lng: suggestion.lng });
  };

  const vider = () => {
    setTexte('');
    setSuggestions([]);
    onSelection(null);
    inputRef.current?.focus();
  };

  const iconeSource = (source) => {
    if (source === 'gare') return <Bus className="w-4 h-4 text-kotrou-orange shrink-0" />;
    if (source === 'nominatim') return <Search className="w-4 h-4 text-gray-400 shrink-0" />;
    return <MapPin className="w-4 h-4 text-transport-woro shrink-0" />;
  };

  const couleurPoint = type === 'depart' ? 'bg-kotrou-vert' : 'bg-kotrou-rouge';

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 h-11 shadow-sm">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${texte ? couleurPoint : 'bg-gray-300'}`} />
        <input
          ref={inputRef}
          type="text"
          value={texte}
          placeholder={placeholder}
          onChange={(e) => {
            setTexte(e.target.value);
            setOuvert(true);
            rechercher(e.target.value);
          }}
          onFocus={() => texte.length >= 2 && setOuvert(true)}
          className="flex-1 text-sm bg-transparent outline-none min-w-0 text-kotrou-gris placeholder:text-gray-400"
        />
        {texte && (
          <button onClick={vider} className="w-7 h-7 flex items-center justify-center shrink-0 active:bg-gray-100 rounded-full">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {ouvert && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {suggestions.map((s, i) => (
            <li key={`${s.nom}-${i}`}>
              <button
                onClick={() => choisir(s)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left active:bg-gray-50 min-h-[44px]"
              >
                {iconeSource(s.source)}
                <span className="text-sm text-kotrou-gris truncate">{s.nom}</span>
              </button>
            </li>
          ))}
          {chargementNom && (
            <li className="px-3 py-2 text-xs text-gray-400 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-gray-300 border-t-kotrou-orange rounded-full animate-spin" />
              Recherche Nominatim…
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
