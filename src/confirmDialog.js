/*
const confirmDialog = document.getElementById('confirm-dialog');
const okBtn = document.getElementById('confirm-btn-ok');
const cancelBtn = document.getElementById('confirm-btn-cancel');

export function showModalDialog({message = 'Are you sure?'} = {}) {
  confirmDialog.querySelector('p').textContent = message;

  return new Promise((resolve) => {
    // Avoid leaking handlers across calls
    const cleanup = () => {
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      confirmDialog.removeEventListener('close', onClose);
    };

    const onOk = () => confirmDialog.close('ok');
    const onCancel = () => confirmDialog.close('cancel');

    const onClose = () => {
      const ok = confirmDialog.returnValue === 'ok';
      cleanup();
      resolve(ok);
    };

    okBtn.addEventListener('click', onOk, {once: true});
    cancelBtn.addEventListener('click', onCancel, {once: true});
    confirmDialog.addEventListener('close', onClose, {once: true});

    confirmDialog.showModal();
    okBtn.focus();
  });
}
*/

const confirmDialog = document.getElementById('confirm-dialog');
const messageEl = document.getElementById('confirm-dialog-message');
const okBtn = document.getElementById('confirm-btn-ok');

export function showModalDialog({message = 'Are you sure?'} = {}) {

  if (messageEl) messageEl.textContent = message;

  return new Promise((resolve) => {
    const cleanup = () => {
      confirmDialog.removeEventListener('close', onClose);
      confirmDialog.removeEventListener('cancel', onCancel);
    };

    const resolveFromReturnValue = () => {
      // returnValue comes from the clicked <button value="..."> in form[method=dialog]
      const rv = (confirmDialog.returnValue || '').toLowerCase();
      resolve(rv === 'ok');
    };

    const onClose = () => {
      cleanup();
      resolveFromReturnValue();
    };

    const onCancel = (e) => {
      confirmDialog.returnValue = 'cancel';
    };

    confirmDialog.addEventListener('close', onClose, { once: true });
    confirmDialog.addEventListener('cancel', onCancel);

    confirmDialog.showModal();
    okBtn.focus();
  });
}
