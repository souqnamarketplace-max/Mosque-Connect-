# HOW TO WIRE PreferencesSection INTO YOUR PROFILE SETTINGS PAGE

## 1. Files to add (already built):
- src/components/profile/PreferencesSection.tsx
- src/app/api/user-preferences/mosque/route.ts
- src/app/api/onboarding/mosque-location/route.ts

## 2. In your existing profile settings SERVER component, read the cookie + primary mosque:

```tsx
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import PreferencesSection from '@/components/profile/PreferencesSection';

// Inside the async page/component:
const cookieStore = await cookies();
const lang = (cookieStore.get('mc_locale')?.value ?? 'en') as 'en' | 'ar' | 'ur';

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

let currentMosqueId: string | null = null;
if (user) {
  const { data } = await supabase
    .from('user_mosque_subscriptions')
    .select('mosque_id')
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .single();
  currentMosqueId = data?.mosque_id ?? null;
}
```

## 3. Then render the component where you want the preferences section to appear:

```tsx
<PreferencesSection
  currentLang={lang}
  currentMosqueId={currentMosqueId}
/>
```

## 4. Cookie name — IMPORTANT:
The component writes `mc_locale` as the cookie name.
If your existing language system uses a DIFFERENT cookie name, update this line
in PreferencesSection.tsx:
  document.cookie = `mc_locale=${newLang};path=/;max-age=31536000;SameSite=Lax`;

Check your existing i18n middleware or ThemeSync component to confirm the cookie name.

## 5. The /api/onboarding/provinces and /api/onboarding/cities and /api/onboarding/mosques
routes are assumed to already exist from onboarding. If they use different paths,
update the fetch() calls in PreferencesSection.tsx accordingly.
