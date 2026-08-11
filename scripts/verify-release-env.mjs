/**
 * `--warn-only`: eksikleri aynı listeyle basar ama çıkış kodu 0 döner.
 *
 * Bu bayrak `prebuild:web` içinde kullanılıyor. Amaç, Vercel derlemesinde
 * "Sentry DSN yok, bu derleme çökmeleri bildirmeyecek" uyarısını görünür kılmak
 * ama deploy'u düşürmemek. Sert kapı hâlâ `npm run release:env` (bayraksız).
 */
const warnOnly = process.argv.includes('--warn-only');

const required = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_SENTRY_DSN',
  'EXPO_PUBLIC_APP_VERSION',
  'EXPO_PUBLIC_BUILD_NUMBER',
  'SENTRY_AUTH_TOKEN',
  'SENTRY_ORG',
  'SENTRY_PROJECT',
];
const failures = required
  .filter((name) => !process.env[name]?.trim())
  .map((name) => `${name} is missing`);

if (process.env.EXPO_PUBLIC_APP_ENV !== 'production') {
  failures.push('EXPO_PUBLIC_APP_ENV must equal production');
}
validateHttpsUrl('EXPO_PUBLIC_SUPABASE_URL', failures);
validateHttpsUrl('EXPO_PUBLIC_SENTRY_DSN', failures);

const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
if (/service[_-]?role|sb_secret_/i.test(publishableKey)) {
  failures.push('The client build contains a privileged Supabase key');
}
if (
  process.env.EXPO_PUBLIC_APP_VERSION &&
  !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(process.env.EXPO_PUBLIC_APP_VERSION)
) {
  failures.push('EXPO_PUBLIC_APP_VERSION must be SemVer');
}
if (
  process.env.EXPO_PUBLIC_BUILD_NUMBER &&
  !/^[1-9]\d*$/.test(process.env.EXPO_PUBLIC_BUILD_NUMBER)
) {
  failures.push('EXPO_PUBLIC_BUILD_NUMBER must be a positive integer');
}

if (failures.length) {
  if (warnOnly) {
    console.warn('Release environment is incomplete; building anyway:');
    failures.forEach((failure) => console.warn(`- ${failure}`));
    if (!process.env.EXPO_PUBLIC_SENTRY_DSN?.trim()) {
      console.warn(
        'No EXPO_PUBLIC_SENTRY_DSN: this build reports no crashes. Set it in the Vercel project environment to turn crash reporting on.',
      );
    }
  } else {
    console.error('Release environment gate failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
} else {
  console.log('Production release environment is complete and uses non-privileged client values.');
}

function validateHttpsUrl(name, failures) {
  const value = process.env[name];
  if (!value) return;
  try {
    if (new URL(value).protocol !== 'https:') failures.push(`${name} must use HTTPS`);
  } catch {
    failures.push(`${name} must be a valid URL`);
  }
}
