export const PROFILE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function validateProfileImageFile(file: File): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return 'Please select a JPG, PNG, or WEBP image.';
  }

  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    return 'Image must be 5MB or smaller.';
  }

  return null;
}
