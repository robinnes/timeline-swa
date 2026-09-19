export function showModalDialog({
  message = 'Are you sure?',
  showCancelBtn = true
} = {}) {

  // not defined outside the function - embed mode will lack these DOM elements
  const confirmDialog = document.getElementById('confirm-dialog');
  const messageEl = document.getElementById('confirm-dialog-message');
  const okBtn = document.getElementById('confirm-btn-ok');
  const cancelBtn = document.getElementById('confirm-btn-cancel');

  if (!confirmDialog || !messageEl || !okBtn || !cancelBtn) {
    console.error('Confirmation dialog is not available.');
    return Promise.resolve(false);
  }

  messageEl.textContent = message;
  cancelBtn.hidden = !showCancelBtn;

  return new Promise((resolve) => {
    const cleanup = () => {
      confirmDialog.removeEventListener('close', onClose);
      confirmDialog.removeEventListener('cancel', onCancel);
    };

    const resolveFromReturnValue = () => {
      const rv = (confirmDialog.returnValue || '').toLowerCase();
      resolve(rv === 'ok');
    };

    const onClose = () => {
      cleanup();
      resolveFromReturnValue();
    };

    const onCancel = () => {
      confirmDialog.returnValue = 'cancel';
    };

    confirmDialog.addEventListener('close', onClose, {once: true});
    confirmDialog.addEventListener('cancel', onCancel);

    confirmDialog.showModal();
    okBtn.focus();
  });
}