import {DRAW} from './constants.js';
import {canvas, draw} from './canvas.js';
import {updateThumbnailView} from './panel.js';
import {updateSaveButton, updateThumbnailEdit} from './panelEdit.js';
import {initializeItem} from "./timeline.js";
import {getImageTarget, clearImageBlobCache} from "./image.js";

const imageModal = document.getElementById('image-modal');
const editImage = document.getElementById('edit-image');

let cropper = null;
let currentObjectUrl = null;
let currentTarget = "item";

function destroyCropper() {
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
}

export function openImageThumbnailDialog(target = "item") {
  currentTarget = target;
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
  e.preventDefault();
  const target = e.target;

  if (target.matches('[data-modal-close]')) {
    closeImageModal();
  }

  if (target.matches('[data-modal-action="cancel"]')) {
    closeImageModal();
  }

  if (target.matches('[data-modal-action="ok"]')) {
    getImageThumbnail();
  }
});

function getImageThumbnail() {
  if (!cropper) {
    closeImageModal();
    return;
  }

  try {
    const imageTarget = getImageTarget(currentTarget);
    if (!imageTarget?.subject || !imageTarget?.timeline) {
      closeImageModal();
      return;
    }
    const subject = imageTarget.subject;
    const tl = imageTarget.timeline;

    const canvasThumbnail = cropper.getCroppedCanvas({
      width: DRAW.THUMB_LABEL_SIZE,
      height: DRAW.THUMB_LABEL_SIZE
    });

    const canvasBlob = cropper.getCroppedCanvas({
      width: DRAW.THUMB_SIZE,
      height: DRAW.THUMB_SIZE
    });

    const thumbnail = canvasThumbnail.toDataURL('image/webp', 0.9); // encode image string; last parameter is image quality (0...1)
    const _pendingData = canvasBlob.toDataURL('image/webp', 0.9);

    clearImageBlobCache(subject, tl);

    const file = `${imageTarget.id}_thumb.webp`;
    subject.image = { thumbnail, file, _pendingData };  // full-size image is stored in _pendingData until timeline is saved
    
    tl._dirty = true;

    if (currentTarget  === "item") initializeItem(subject);  // label display must adjust
  
    updateThumbnailView(imageTarget.subject, currentTarget);
    updateThumbnailEdit(imageTarget.subject, currentTarget);
    
    updateSaveButton();
    draw(true);

  } catch (err) {
    console.error(err);
  } finally {
    closeImageModal();
  }
}

export function removeImageThumbnail(target) {
  const imageTarget = getImageTarget(target);
  if (!imageTarget?.subject || !imageTarget?.timeline) return;

  clearImageBlobCache(imageTarget.subject, imageTarget.timeline);

  imageTarget.subject.image = null;
  imageTarget.timeline._dirty = true;

  if (target === "item") initializeItem(imageTarget.subject);

  updateThumbnailView(imageTarget.subject, target);
  updateThumbnailEdit(imageTarget.subject, target);
  
  updateSaveButton();
  draw(true);
}
