import {appState} from './canvas.js';
import {setSidebarEvent} from './panel.js';

const imageModal = document.getElementById('image-modal');
const editImage = document.getElementById('edit-image');

let cropper = null;
let currentObjectUrl = null;

function destroyCropper() {
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
}

export function getImageThumbnail() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      console.warn('Selected file is not an image');
      return;
    }

    destroyCropper();

    // Revoke previous URL if any
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }

    currentObjectUrl = URL.createObjectURL(file);
    editImage.src = currentObjectUrl;
    
    editImage.onload = () => {
      openImageModal();
      cropper = new window.Cropper(editImage, {
        aspectRatio: 1,
        cropBoxResizable: true,
        viewMode: 1,
        responsive: true,
        background: false,
        dragMode: 'move',
        autoCropArea: 0.8
      });
    };

  });

  input.click();
}

function openImageModal() {
  imageModal.removeAttribute('hidden');
  document.body.classList.add('modal-open');
}

function closeImageModal() {
  imageModal.setAttribute('hidden', '');
  document.body.classList.remove('modal-open');

  destroyCropper();
  editImage.removeAttribute('src');

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
  canvas.focus();
}

imageModal.addEventListener('click', (e) => {
  const target = e.target;
  //const modalId = target.getAttribute('data-modal-target');

  if (target.matches('[data-modal-close]')) {
    closeImageModal();
  }

  if (target.matches('[data-modal-action="cancel"]')) {
    closeImageModal();
  }

  if (target.matches('[data-modal-action="ok"]')) {
    if (cropper) {
      // Retrieve cropped image
      const canvas32 = cropper.getCroppedCanvas({
        width: 36,
        height: 36
      });

      // Encode thumbnail (WebP)
      const dataUrl = canvas32.toDataURL('image/webp', 0.9);
      
      if (appState.selected?.event) {
        const e = appState.selected.event;

        // Update the selected event
        e.thumbnail = dataUrl;
        appState.selected.timeline.dirty = true;
        
        // Update panel
        setSidebarEvent(e)
      }

    }
    closeImageModal();
  }

});
