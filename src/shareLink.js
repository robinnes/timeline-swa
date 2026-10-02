const modal = document.getElementById('share-link-modal');
const labelInput = document.getElementById('share-link-label');
const valueOutput = document.getElementById('share-link-value');
const embedOption = document.getElementById('share-link-embed-option');
const cancelBtn = document.getElementById('share-link-cancel');
const copyBtn = document.getElementById('share-link-copy');

let currentLocator = null;


/* -------------------- Public interface -------------------- */

export function showShareLinkDialog({
  label = '',
  locator,
  allowEmbed = true
}) {
  currentLocator = {
    tl: locator?.tl || null,
    tag: locator?.tag || null,
    item: locator?.item || null
  };

  labelInput.value = label;

  embedOption.hidden = !allowEmbed;

  // Always start with Link selected.
  const linkRadio = modal.querySelector(
    'input[name="share-link-type"][value="link"]'
  );
  linkRadio.checked = true;

  updateShareValue();

  modal.hidden = false;
  document.body.classList.add('modal-open');

  labelInput.focus();
  labelInput.select();

}


/* -------------------- Formatting -------------------- */

function formatLink(label, locator) {
  const attrs = [];

  if (locator.tl)
    attrs.push(`tl="${escapeAttribute(locator.tl)}"`);

  if (locator.tag)
    attrs.push(`tag="${escapeAttribute(locator.tag)}"`);

  if (locator.item)
    attrs.push(`item="${escapeAttribute(locator.item)}"`);

  const attrText = attrs.length ? ' ' + attrs.join(' ') : '';

  return `<a href="#"${attrText}>${escapeHTML(label)}</a>`;
}


function formatURL(locator) {
  const url = new URL(window.location.origin);

  if (locator.tl)
    url.searchParams.set('tl', locator.tl);

  if (locator.tag)
    url.searchParams.set('tag', locator.tag);

  if (locator.item)
    url.searchParams.set('item', locator.item);

  return url.toString();
}


function formatEmbed(locator) {
  const url = formatURL(locator);

  return `<iframe src="${escapeAttribute(url)}"></iframe>`;
}


/* -------------------- Dialog handling -------------------- */

function updateShareValue() {
  if (!currentLocator) return;

  const type = modal.querySelector(
    'input[name="share-link-type"]:checked'
  )?.value;

  switch (type) {
    case 'url':
      valueOutput.value = formatURL(currentLocator);
      break;

    case 'embed':
      valueOutput.value = formatEmbed(currentLocator);
      break;

    default:
      valueOutput.value = formatLink(
        labelInput.value,
        currentLocator
      );
  }
}


function closeShareLinkDialog() {
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  currentLocator = null;
}


/* -------------------- Events -------------------- */

labelInput.addEventListener('input', updateShareValue);

modal.querySelectorAll('input[name="share-link-type"]')
  .forEach(input => {
    input.addEventListener('change', updateShareValue);
  });

cancelBtn.addEventListener('click', closeShareLinkDialog);

copyBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(valueOutput.value);
  closeShareLinkDialog();
});

modal.querySelector('.modal__backdrop')
  .addEventListener('click', closeShareLinkDialog);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modal.hidden)
    closeShareLinkDialog();
});


/* -------------------- Escaping -------------------- */

function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}


function escapeAttribute(value) {
  return escapeHTML(value)
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
