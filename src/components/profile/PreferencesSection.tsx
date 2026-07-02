'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Province { id: string; name: string; name_ar: string; name_ur: string; code: string; }
interface City     { id: string; name: string; name_ar: string; name_ur: string; province_id: string; }
interface Mosque   { id: string; name: string; address: string; city_id: string; }

type Lang = 'en' | 'ar' | 'ur';

interface Props {
  /** Current language – read from cookie by the parent server component */
  currentLang: Lang;
  /** Currently selected primary mosque id */
  currentMosqueId: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const LANG_LABELS: Record<Lang, { label: string; native: string }> = {
  en: { label: 'English',  native: 'English'  },
  ar: { label: 'Arabic',   native: 'العربية'  },
  ur: { label: 'Urdu',     native: 'اردو'     },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function PreferencesSection({ currentLang, currentMosqueId }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Language
  const [lang, setLang] = useState<Lang>(currentLang);

  // Mosque cascade
  const [provinces, setProvinces]         = useState<Province[]>([]);
  const [cities, setCities]               = useState<City[]>([]);
  const [mosques, setMosques]             = useState<Mosque[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCity, setSelectedCity]         = useState<string>('');
  const [selectedMosque, setSelectedMosque]     = useState<string>(currentMosqueId ?? '');
  const [search, setSearch]               = useState('');

  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingCities, setLoadingCities]       = useState(false);
  const [loadingMosques, setLoadingMosques]     = useState(false);
  const [savingMosque, setSavingMosque]         = useState(false);
  const [savedMosque, setSavedMosque]           = useState(false);
  const [error, setError]                       = useState<string | null>(null);

  // ── Load provinces once ───────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/onboarding/provinces')
      .then(r => r.json())
      .then(data => {
        setProvinces(data.provinces ?? []);
        setLoadingProvinces(false);
      })
      .catch(() => setLoadingProvinces(false));
  }, []);

  // ── Load current mosque location to pre-select province/city ─────────────
  useEffect(() => {
    if (!currentMosqueId) return;
    fetch(`/api/onboarding/mosque-location?mosque_id=${currentMosqueId}`)
      .then(r => r.json())
      .then(data => {
        if (data.province_id) setSelectedProvince(data.province_id);
        if (data.city_id)     setSelectedCity(data.city_id);
      })
      .catch(() => {});
  }, [currentMosqueId]);

  // ── Load cities when province changes ────────────────────────────────────
  useEffect(() => {
    if (!selectedProvince) { setCities([]); setSelectedCity(''); setMosques([]); return; }
    setLoadingCities(true);
    fetch(`/api/onboarding/cities?province_id=${selectedProvince}`)
      .then(r => r.json())
      .then(data => { setCities(data.cities ?? []); setLoadingCities(false); })
      .catch(() => setLoadingCities(false));
  }, [selectedProvince]);

  // ── Load mosques when city changes ───────────────────────────────────────
  useEffect(() => {
    if (!selectedCity) { setMosques([]); return; }
    setLoadingMosques(true);
    fetch(`/api/onboarding/mosques?city_id=${selectedCity}`)
      .then(r => r.json())
      .then(data => { setMosques(data.mosques ?? []); setLoadingMosques(false); })
      .catch(() => setLoadingMosques(false));
  }, [selectedCity]);

  // ── Language change ───────────────────────────────────────────────────────
  function handleLangChange(newLang: Lang) {
    if (newLang === lang) return;
    setLang(newLang);
    // Write cookie then reload so server components re-render in new language
    document.cookie = `mc_locale=${newLang};path=/;max-age=31536000;SameSite=Lax`;
    startTransition(() => { router.refresh(); });
  }

  // ── Mosque save ───────────────────────────────────────────────────────────
  async function handleSaveMosque() {
    if (!selectedMosque || selectedMosque === currentMosqueId) return;
    setSavingMosque(true);
    setError(null);
    try {
      const res = await fetch('/api/user-preferences/mosque', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mosque_id: selectedMosque }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSavedMosque(true);
      setTimeout(() => setSavedMosque(false), 3000);
      startTransition(() => router.refresh());
    } catch {
      setError('Could not save mosque. Please try again.');
    } finally {
      setSavingMosque(false);
    }
  }

  const filteredMosques = mosques.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.address.toLowerCase().includes(search.toLowerCase())
  );

  const provinceLabel = (p: Province) =>
    lang === 'ar' ? p.name_ar || p.name : lang === 'ur' ? p.name_ur || p.name : p.name;
  const cityLabel = (c: City) =>
    lang === 'ar' ? c.name_ar || c.name : lang === 'ur' ? c.name_ur || c.name : c.name;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="preferences-section">

      {/* ── Language ─────────────────────────────────────────────────── */}
      <section className="pref-block">
        <h3 className="pref-heading">
          {lang === 'ar' ? 'اللغة' : lang === 'ur' ? 'زبان' : 'Language'}
        </h3>
        <div className="lang-row">
          {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
            <button
              key={l}
              onClick={() => handleLangChange(l)}
              className={`lang-btn ${lang === l ? 'lang-btn--active' : ''}`}
              aria-pressed={lang === l}
            >
              <span className="lang-native">{LANG_LABELS[l].native}</span>
              <span className="lang-sub">{LANG_LABELS[l].label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="pref-divider" />

      {/* ── Mosque ───────────────────────────────────────────────────── */}
      <section className="pref-block">
        <h3 className="pref-heading">
          {lang === 'ar' ? 'المسجد المفضل' : lang === 'ur' ? 'پسندیدہ مسجد' : 'Your Mosque'}
        </h3>
        <p className="pref-hint">
          {lang === 'ar'
            ? 'اختر مقاطعتك ثم مدينتك ثم مسجدك'
            : lang === 'ur'
            ? 'اپنا صوبہ، پھر شہر، پھر مسجد منتخب کریں'
            : 'Choose your province, then city, then mosque'}
        </p>

        {/* Province */}
        <label className="pref-label">
          {lang === 'ar' ? 'المقاطعة' : lang === 'ur' ? 'صوبہ' : 'Province'}
        </label>
        <select
          className="pref-select"
          value={selectedProvince}
          onChange={e => { setSelectedProvince(e.target.value); setSelectedCity(''); setSelectedMosque(''); setSearch(''); }}
          disabled={loadingProvinces}
        >
          <option value="">
            {loadingProvinces
              ? '...'
              : lang === 'ar' ? 'اختر المقاطعة' : lang === 'ur' ? 'صوبہ منتخب کریں' : 'Select province'}
          </option>
          {provinces.map(p => (
            <option key={p.id} value={p.id}>{provinceLabel(p)}</option>
          ))}
        </select>

        {/* City */}
        {selectedProvince && (
          <>
            <label className="pref-label">
              {lang === 'ar' ? 'المدينة' : lang === 'ur' ? 'شہر' : 'City'}
            </label>
            <select
              className="pref-select"
              value={selectedCity}
              onChange={e => { setSelectedCity(e.target.value); setSelectedMosque(''); setSearch(''); }}
              disabled={loadingCities}
            >
              <option value="">
                {loadingCities
                  ? '...'
                  : lang === 'ar' ? 'اختر المدينة' : lang === 'ur' ? 'شہر منتخب کریں' : 'Select city'}
              </option>
              {cities.map(c => (
                <option key={c.id} value={c.id}>{cityLabel(c)}</option>
              ))}
            </select>
          </>
        )}

        {/* Mosque list */}
        {selectedCity && (
          <>
            <label className="pref-label">
              {lang === 'ar' ? 'المسجد' : lang === 'ur' ? 'مسجد' : 'Mosque'}
            </label>

            {/* Search */}
            <input
              type="search"
              className="pref-search"
              placeholder={lang === 'ar' ? 'بحث...' : lang === 'ur' ? 'تلاش...' : 'Search mosques...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            {loadingMosques ? (
              <div className="pref-loading">
                {lang === 'ar' ? 'جاري التحميل...' : lang === 'ur' ? 'لوڈ ہو رہا ہے...' : 'Loading...'}
              </div>
            ) : filteredMosques.length === 0 ? (
              <div className="pref-empty">
                {lang === 'ar' ? 'لا توجد مساجد' : lang === 'ur' ? 'کوئی مسجد نہیں ملی' : 'No mosques found'}
              </div>
            ) : (
              <div className="mosque-list" role="listbox" aria-label="Mosques">
                {filteredMosques.map(m => (
                  <button
                    key={m.id}
                    role="option"
                    aria-selected={selectedMosque === m.id}
                    className={`mosque-card ${selectedMosque === m.id ? 'mosque-card--selected' : ''}`}
                    onClick={() => setSelectedMosque(m.id)}
                  >
                    <div className="mosque-card__check">
                      {selectedMosque === m.id && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div className="mosque-card__info">
                      <span className="mosque-card__name">{m.name}</span>
                      {m.address && <span className="mosque-card__addr">{m.address}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Save button */}
        {selectedMosque && selectedMosque !== currentMosqueId && (
          <button
            className="pref-save-btn"
            onClick={handleSaveMosque}
            disabled={savingMosque}
          >
            {savingMosque
              ? (lang === 'ar' ? 'جاري الحفظ...' : lang === 'ur' ? 'محفوظ ہو رہا ہے...' : 'Saving...')
              : (lang === 'ar' ? 'حفظ المسجد' : lang === 'ur' ? 'مسجد محفوظ کریں' : 'Save Mosque')}
          </button>
        )}

        {savedMosque && (
          <p className="pref-success">
            {lang === 'ar' ? '✓ تم الحفظ' : lang === 'ur' ? '✓ محفوظ ہوگیا' : '✓ Saved successfully'}
          </p>
        )}
        {error && <p className="pref-error">{error}</p>}
      </section>

      <style>{`
        .preferences-section { padding: 0 0 2rem; }

        .pref-block { padding: 1.25rem 1rem; }

        .pref-divider {
          height: 1px;
          background: var(--color-border, rgba(0,0,0,0.08));
          margin: 0 1rem;
        }

        .pref-heading {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-ink, #1a1a1a);
          margin: 0 0 1rem;
        }

        .pref-hint {
          font-size: 0.8125rem;
          color: var(--color-ink-muted, #666);
          margin: -0.5rem 0 1rem;
        }

        /* ── Language buttons ── */
        .lang-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.625rem;
        }

        .lang-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.2rem;
          padding: 0.875rem 0.5rem;
          border-radius: 12px;
          border: 2px solid var(--color-border, rgba(0,0,0,0.12));
          background: var(--color-surface, #fff);
          cursor: pointer;
          transition: all 0.18s ease;
          min-height: 64px;
        }

        .lang-btn--active {
          border-color: var(--color-emerald, #1b4332);
          background: var(--color-emerald-light, #d8f3dc);
        }

        .lang-native {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--color-ink, #1a1a1a);
        }

        .lang-btn--active .lang-native {
          color: var(--color-emerald, #1b4332);
        }

        .lang-sub {
          font-size: 0.6875rem;
          color: var(--color-ink-muted, #666);
        }

        /* ── Form fields ── */
        .pref-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-ink, #1a1a1a);
          margin-bottom: 0.4rem;
          margin-top: 1rem;
        }

        .pref-select {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          border: 1.5px solid var(--color-border, rgba(0,0,0,0.14));
          background: var(--color-surface, #fff);
          font-size: 0.9375rem;
          color: var(--color-ink, #1a1a1a);
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 2.5rem;
          min-height: 48px;
        }

        .pref-search {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          border: 1.5px solid var(--color-border, rgba(0,0,0,0.14));
          background: var(--color-surface, #fff);
          font-size: 0.9375rem;
          color: var(--color-ink, #1a1a1a);
          margin-bottom: 0.75rem;
          min-height: 48px;
          box-sizing: border-box;
        }

        /* ── Mosque list ── */
        .mosque-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 340px;
          overflow-y: auto;
          overscroll-behavior: contain;
        }

        .mosque-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          border-radius: 12px;
          border: 1.5px solid var(--color-border, rgba(0,0,0,0.1));
          background: var(--color-surface, #fff);
          cursor: pointer;
          text-align: left;
          transition: all 0.15s ease;
          min-height: 56px;
          width: 100%;
        }

        .mosque-card--selected {
          border-color: var(--color-emerald, #1b4332);
          background: var(--color-emerald-light, #d8f3dc);
        }

        .mosque-card__check {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid var(--color-border, rgba(0,0,0,0.2));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--color-emerald, #1b4332);
        }

        .mosque-card--selected .mosque-card__check {
          background: var(--color-emerald, #1b4332);
          border-color: var(--color-emerald, #1b4332);
          color: #fff;
        }

        .mosque-card__info {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          flex: 1;
          min-width: 0;
        }

        .mosque-card__name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--color-ink, #1a1a1a);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mosque-card--selected .mosque-card__name {
          color: var(--color-emerald, #1b4332);
        }

        .mosque-card__addr {
          font-size: 0.75rem;
          color: var(--color-ink-muted, #666);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Save / feedback ── */
        .pref-save-btn {
          margin-top: 1.25rem;
          width: 100%;
          padding: 0.9rem;
          border-radius: 12px;
          background: var(--color-emerald, #1b4332);
          color: #fff;
          font-size: 1rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          min-height: 52px;
          transition: opacity 0.15s;
        }

        .pref-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .pref-success {
          margin-top: 0.75rem;
          text-align: center;
          font-size: 0.9rem;
          color: var(--color-emerald, #1b4332);
          font-weight: 600;
        }

        .pref-error {
          margin-top: 0.75rem;
          text-align: center;
          font-size: 0.875rem;
          color: #c0392b;
        }

        .pref-loading, .pref-empty {
          text-align: center;
          padding: 1.5rem;
          color: var(--color-ink-muted, #666);
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
