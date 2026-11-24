const OFFER_IMAGE_MAX_SIZE = 8 * 1024 * 1024;

const imageSignatures = new Map([
  ['image/jpeg', (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff],
  ['image/png', (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))],
  ['image/gif', (buffer) => buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))],
  ['image/webp', (buffer) => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'],
]);

function validateOfferImage(file) {
  if (file && (file.size > OFFER_IMAGE_MAX_SIZE || file.buffer?.length > OFFER_IMAGE_MAX_SIZE)) {
    return 'Offer images must be 8 MB or smaller.';
  }
  if (!file || !Buffer.isBuffer(file.buffer) || !imageSignatures.get(file.mimetype)?.(file.buffer)) {
    return 'Upload a JPEG, PNG, GIF, or WebP image file.';
  }
  return null;
}

function getOfferImageFields(file, offerId, existingOffer = {}) {
  if (!file) {
    return {
      image: existingOffer.image || '',
      ...(existingOffer.imageData && existingOffer.imageContentType
        ? {
            imageData: existingOffer.imageData,
            imageContentType: existingOffer.imageContentType,
          }
        : {}),
    };
  }

  return {
    image: `/api/offers/${encodeURIComponent(String(offerId))}/image`,
    imageData: file.buffer.toString('base64'),
    imageContentType: file.mimetype,
  };
}

function toPublicOffer(offer) {
  const { imageData, imageContentType, ...publicOffer } = offer;
  return publicOffer;
}

module.exports = {
  getOfferImageFields,
  OFFER_IMAGE_MAX_SIZE,
  toPublicOffer,
  validateOfferImage,
};
