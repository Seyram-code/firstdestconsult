const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getOfferImageFields,
  OFFER_IMAGE_MAX_SIZE,
  toPublicOffer,
  validateOfferImage,
} = require('./offerImageStorage');

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test('validates supported image signatures and rejects unsupported image data', () => {
  assert.equal(validateOfferImage({ buffer: png, mimetype: 'image/png', size: png.length }), null);
  assert.match(
    validateOfferImage({ buffer: png, mimetype: 'image/jpeg', size: png.length }),
    /JPEG, PNG, GIF, or WebP/,
  );
  assert.match(
    validateOfferImage({ buffer: Buffer.from('not an image'), mimetype: 'image/png', size: 12 }),
    /JPEG, PNG, GIF, or WebP/,
  );
});

test('enforces the offer image size limit', () => {
  assert.match(
    validateOfferImage({
      buffer: Buffer.alloc(OFFER_IMAGE_MAX_SIZE + 1),
      mimetype: 'image/png',
      size: OFFER_IMAGE_MAX_SIZE + 1,
    }),
    /8 MB or smaller/,
  );
});

test('stores uploaded image bytes under a stable offer image endpoint', () => {
  const image = getOfferImageFields(
    { buffer: png, mimetype: 'image/png' },
    123,
  );

  assert.equal(image.image, '/api/offers/123/image');
  assert.equal(image.imageContentType, 'image/png');
  assert.equal(Buffer.from(image.imageData, 'base64').compare(png), 0);
});

test('retains existing image fields when an offer is updated without a new upload', () => {
  const existingOffer = {
    image: '/api/offers/123/image',
    imageData: png.toString('base64'),
    imageContentType: 'image/png',
  };

  assert.deepEqual(getOfferImageFields(null, 123, existingOffer), existingOffer);
});

test('preserves legacy file-backed image URLs when no replacement is uploaded', () => {
  const existingOffer = { image: '/uploads/offers/legacy.png' };

  assert.deepEqual(getOfferImageFields(null, 123, existingOffer), existingOffer);
});

test('omits image bytes from public offer records', () => {
  const offer = {
    id: 123,
    image: '/api/offers/123/image',
    imageData: png.toString('base64'),
    imageContentType: 'image/png',
  };

  assert.deepEqual(toPublicOffer(offer), { id: 123, image: '/api/offers/123/image' });
});
