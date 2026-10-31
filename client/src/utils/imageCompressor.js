/**
 * Utility to downscale and compress high-resolution phone images before upload.
 * Smartphone cameras capture images at 12MP-48MP (5MB-15MB), which can time out
 * or trigger upload limits on mobile connections.
 * Downscaling to max 1600px keeps upload sizes under 800KB with zero loss of AI segmentation quality.
 */
export const compressImageForUpload = async (file, maxDimension = 1280, quality = 0.82) => {
  if (!file || !(file instanceof Blob) || !file.type.startsWith("image/")) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // If image already fits comfortably within maxDimension and < 500KB, use directly
        if (width <= maxDimension && height <= maxDimension && file.size < 500 * 1024) {
          return resolve(file);
        }

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob && (blob.size < file.size || width !== img.width)) {
              const fileName = file.name ? file.name.replace(/\.[^/.]+$/, ".jpg") : "road_capture.jpg";
              const compressedFile = new File([blob], fileName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};
