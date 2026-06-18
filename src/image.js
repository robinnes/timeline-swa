import * as Util from './util.js';
import {DRAW} from './constants.js';
import {appState, draw, itemImageBlobCache} from './canvas.js';
import {setSidebarItem} from './panel.js';
import {initializeItem} from "./timeline.js";
import {saveItemImageToStorage, loadItemImageFromStorage} from './database.js';

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
    e.preventDefault();

    if (!cropper || !appState.selected?.item) {
      closeImageModal();
      return;
    }

    const item = appState.selected.item;
    const tl = appState.selected.timeline ?? item._timeline;

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
        const url = await saveItemImageToStorage(tl._scope, tl._file, item.id, blob);

        // clear cached image if present
        const oldImageUrl = item.image?.url ?? null;
        if (oldImageUrl) clearItemImageBlobCache(tl._scope, oldImageUrl);

        item.image = { thumbnail, url };
        //delete item.thumbnail; // optional backward cleanup

        tl._dirty = true;

        setSidebarItem(item);
        initializeItem(item);
        draw(true);

      } catch (err) {
        console.error(err);
      } finally {
        closeImageModal();
      }
    }, 'image/webp', 0.9);
  }
});

export function removeImageThumbnail() {
  const item = appState.selected.item;
  if (!item) return;

  const oldImageUrl = item.image?.url ?? null;
  if (oldImageUrl) {
    clearItemImageBlobCache(item._timeline._scope, oldImageUrl);
  }

  item.image = null;
  delete item.thumbnail;

  item._timeline._dirty = true;

  setSidebarItem(item);
  initializeItem(item);
  draw(true);
}

/******************* Image/thumbnail cache *******************/

function itemImageCacheKey(scope, imageUrl) {
  return `${scope}:${imageUrl}`;
}


export function getImageObjectUrlfromCache(scope, imageUrl) {
  if (!imageUrl) return null;

  const key = itemImageCacheKey(scope, imageUrl);
  const objectUrl = itemImageBlobCache.get(key);

  if (objectUrl) return objectUrl;
}

export async function getImageObjectUrlfromStorage(scope, imageUrl) {
  if (!imageUrl) return null;

  const blob = await loadItemImageFromStorage(scope, imageUrl);  // retrieve the image blob from storage
  const objectUrl = URL.createObjectURL(blob);  // store in memory; get local URL

  itemImageBlobCache.set(key, objectUrl);  // cache it
  return objectUrl;
}

/*
export async function getCachedItemImageObjectUrl(scope, imageUrl, thumb) {
  if (!imageUrl) return null;

  const key = itemImageCacheKey(scope, imageUrl);
  const cached = itemImageBlobCache.get(key);  // first, check cache
  if (cached) return cached;


  const blob = await loadItemImageFromStorage(scope, imageUrl);  // retrieve the image blob from storage
  const objectUrl = URL.createObjectURL(blob);  // store in memory; get local URL

  itemImageBlobCache.set(key, objectUrl);  // cache it
  return objectUrl;
}
*/

function clearItemImageBlobCache(scope, imageUrl) {
  if (!imageUrl) return;

  const key = itemImageCacheKey(scope, imageUrl);
  const objectUrl = itemImageBlobCache.get(key);

  if (objectUrl) URL.revokeObjectURL(objectUrl);
  itemImageBlobCache.delete(key);
}

export function clearCachedImagesForTimeline(tl) {

  // iterate cache keys and delete rows matching tl
  const prefix = itemImageCacheKey(tl._scope, Util.timelineStem(tl._file));

  for (const [key, objectUrl] of itemImageBlobCache) {
    if (!key.startsWith(prefix)) continue;

    URL.revokeObjectURL(objectUrl);
    itemImageBlobCache.delete(key);
  }
}