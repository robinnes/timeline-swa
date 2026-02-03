const imageDialog = document.getElementById('image-dialog');
const editImage = document.getElementById('edit-image');

let cropper = null;

function destroyCropper() {
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
}

export function showImageDialog() {
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

    const objectUrl = URL.createObjectURL(file);
    console.log(objectUrl);
    editImage.src = objectUrl;


    editImage.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const CropperCtor = window.Cropper?.default ?? window.Cropper;
      if (typeof CropperCtor !== 'function') {
        console.error('Cropper constructor not found:', window.Cropper);
        return;
      }

      cropper = new CropperCtor(editImage, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 1,
        responsive: true,
        background: false
      });
    };


    imageDialog.showModal();
  });

  imageDialog.addEventListener(
    'close',
    () => {
      destroyCropper();
      editImage.removeAttribute('src');
    },
    { once: true }
  );

  input.click();
}
