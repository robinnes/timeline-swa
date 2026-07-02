import * as Util from './util.js';
import {DRAW} from './constants.js';
import {appState, draw, itemImageBlobCache} from './canvas.js';
import {updateSaveButton, updateThumbnailEdit, updateThumbnailView} from './panel.js';
import {initializeItem} from "./timeline.js";
import {saveImageToStorage, loadItemImageFromStorage} from './database.js';

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

export function getImageThumbnail(target = "item") {
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
  const target = e.target;
  //const modalId = target.getAttribute('data-modal-target');

  if (target.matches('[data-modal-close]')) {
    closeImageModal();
  }

  if (target.matches('[data-modal-action="cancel"]')) {
    closeImageModal();
  }

  if (target.matches('[data-modal-action="ok"]')) {
    e.preventDefault();

    if (!cropper) {
      closeImageModal();
      return;
    }

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

    const thumbnail = canvasThumbnail.toDataURL('image/webp', 0.9);

    canvasBlob.toBlob(async (blob) => {
      if (!blob) {
        console.error('Failed to create image blob');
        closeImageModal();
        return;
      }

      try {
        await saveImageToStorage(tl._scope, tl._file, imageTarget.id, blob);

        clearImageBlobCache(subject, tl);

        const file = `${imageTarget.id}_thumb.webp`;
        subject.image = { thumbnail, file };

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
    }, 'image/webp', 0.9);
  }
});

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

/******************* Helpers *******************/

function getImageTarget(target) {
  const tl = appState.selected.timeline;

  if (target === "timeline") {
    return {
      subject: tl,
      timeline: tl,
      id: "timeline"
    };
  }

  if (target === "item") {
    const item = appState.selected.item;
    return {
      subject: item,
      timeline: tl ?? item._timeline,
      id: item.id
    };
  }

  if (target === "tag") {
    const vw = appState.selected.view;
    const tag = (vw.tagFilter) ? tl.tags.find(t => t.id === vw.tagFilter) : null;
    return {
      subject: tag,
      timeline: tl,
      id: tag.id
    };
  }
}


/******************* Image/thumbnail cache *******************/

function imageCacheKey(subject, tl) {
  return `${tl._scope}:${imageFilePath(subject, tl)}`;
}

function imageFilePath(subject, tl) {
  /*const folder = Util.timelineStem(tl._file);
  return `${folder}/${subject.image.file}`;*/
  return `${tl._file}/${subject.image.file}`;  // *** change ***
}

export function getImageObjectUrlfromCache(subject, tl = subject._timeline ?? subject) {
  const key = imageCacheKey(subject, tl);
  return itemImageBlobCache.get(key);
}

export async function getImageObjectUrlfromStorage(subject, tl = subject._timeline ?? subject) {
  const imageFile = imageFilePath(subject, tl);

  const blob = await loadItemImageFromStorage(tl._scope, imageFile);
  const objectUrl = URL.createObjectURL(blob);

  const key = imageCacheKey(subject, tl);
  itemImageBlobCache.set(key, objectUrl);

  return objectUrl;
}

export function clearImageBlobCache(subject, tl) {
  const imageFile = subject.image?.file ?? null;
  if (!imageFile) return;

  const key = imageCacheKey(subject, tl);
  const objectUrl = itemImageBlobCache.get(key);

  if (objectUrl) URL.revokeObjectURL(objectUrl);
  itemImageBlobCache.delete(key);
}

export function clearItemImageBlobCache(item) {
  clearImageBlobCache(item, item._timeline);
}

/*
export function deleteItemImage(item) {
  const scope = item._timeline._scope;
  const imageFile = itemImageFilePath(item);
  if (!imageFile) return;

  try {
    deleteItemImageFromStorage(scope, imageFile);
  } catch (e) {
    console.error('deleleteItemImage failed', e.message);  // fail silently
  }
}
*/

export function clearCachedImagesForTimeline(tl) {
  // iterate cache keys and delete rows matching tl
  /*const folder = Util.timelineStem(tl._file);  // filename minus extension
  const prefix = `${tl._scope}:${folder}`;*/
  const prefix = `${tl._scope}:${tl._file}`;  // *** change ***

  for (const [key, objectUrl] of itemImageBlobCache) {
    if (!key.startsWith(prefix)) continue;

    URL.revokeObjectURL(objectUrl);
    itemImageBlobCache.delete(key);
  }
}