/**
 * Opens a Tally form (https://tally.so/r/<id>) as an on-page pop-up instead of leaving the site.
 * Loaded on demand by scripts.js the first time a visitor points at or clicks a Tally link;
 * Tally's own embed script provides the modal, sizing, focus handling and Escape-to-close.
 * No key or account data is involved: only the form's public ID.
 */
const EMBED_SCRIPT = 'https://tally.so/widgets/embed.js';

let loading;

export function loadTally() {
  if (window.Tally?.openPopup) return Promise.resolve(window.Tally);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = EMBED_SCRIPT;
      script.async = true;
      script.onload = () => (window.Tally?.openPopup
        ? resolve(window.Tally)
        : reject(new Error('Tally embed unavailable')));
      script.onerror = () => reject(new Error('Tally embed failed to load'));
      document.head.append(script);
    }).catch((err) => {
      loading = undefined; // allow a retry on the next click
      throw err;
    });
  }
  return loading;
}

export default async function openTally(formId) {
  const Tally = await loadTally();
  const opener = document.activeElement;
  // Escape closes the pop-up while focus is on the page (Tally handles it inside its frame)
  const onKey = (e) => { if (e.key === 'Escape') Tally.closePopup(formId); };
  document.addEventListener('keydown', onKey);
  Tally.openPopup(formId, {
    layout: 'modal',
    width: 640,
    overlay: true,
    autoClose: 5000, // close 5 s after a successful submit (Tally shows its thank-you first)
    onClose: () => {
      document.removeEventListener('keydown', onKey);
      if (opener?.focus) opener.focus({ preventScroll: true }); // return focus to the link
    },
  });
}
