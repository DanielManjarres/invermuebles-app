import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";
import test, { afterEach } from "node:test";
import {
  downloadProductImage,
  getProductImageContentType,
  getProductImageExtension,
  getProductImageUploadDir,
  maxProductImageSize,
  minimumProductImageLongSide,
  minimumProductImageShortSide,
  normalizedProductImagePadding,
  normalizedProductImageSize,
  normalizeProductImage,
  validateRemoteProductImageUrl,
} from "../../lib/product-image-storage.ts";

const originalUploadDir = process.env.UPLOAD_DIR;
const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];

function networkWith(fetchRemote, lookupHost = publicLookup) {
  return { fetchRemote, lookupHost };
}

afterEach(() => {
  if (originalUploadDir === undefined) {
    delete process.env.UPLOAD_DIR;
  } else {
    process.env.UPLOAD_DIR = originalUploadDir;
  }
});

test("getProductImageExtension normalizes jpeg files", () => {
  assert.equal(getProductImageExtension("producto.jpeg", ""), ".jpg");
});

test("getProductImageExtension accepts image mime type when extension is missing", () => {
  assert.equal(getProductImageExtension("producto", "image/jpeg"), ".jpg");
  assert.equal(getProductImageExtension("producto", "image/png"), ".png");
  assert.equal(getProductImageExtension("producto", "image/webp"), ".webp");
});

test("getProductImageExtension rejects unsupported files", () => {
  assert.equal(getProductImageExtension("producto.svg", "image/svg+xml"), "");
});

test("getProductImageContentType returns expected response content type", () => {
  assert.equal(getProductImageContentType("foto.jpg"), "image/jpeg");
  assert.equal(getProductImageContentType("foto.png"), "image/png");
  assert.equal(getProductImageContentType("foto.webp"), "image/webp");
  assert.equal(getProductImageContentType("foto.gif"), "");
});

test("maxProductImageSize keeps uploads at five megabytes", () => {
  assert.equal(maxProductImageSize, 5 * 1024 * 1024);
});

test("normalizes product images to a square webp canvas", async () => {
  const source = await sharp({
    create: {
      background: "#07552a",
      channels: 3,
      height: minimumProductImageShortSide,
      width: minimumProductImageLongSide,
    },
  })
    .jpeg()
    .toBuffer();

  const normalized = await normalizeProductImage(source);
  const metadata = await sharp(normalized).metadata();

  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, normalizedProductImageSize);
  assert.equal(metadata.height, normalizedProductImageSize);
});

test("removes white source margins before applying the standard padding", async () => {
  const productWidth = 400;
  const productHeight = 200;
  const source = await sharp({
    create: {
      background: "#ffffff",
      channels: 3,
      height: minimumProductImageShortSide,
      width: minimumProductImageLongSide,
    },
  })
    .composite([
      {
        input: {
          create: {
            background: "#07552a",
            channels: 3,
            height: productHeight,
            width: productWidth,
          },
        },
        left: 200,
        top: 200,
      },
    ])
    .png()
    .toBuffer();

  const normalized = await normalizeProductImage(source);
  const visibleContent = await sharp(normalized)
    .trim({ background: "#ffffff", threshold: 20 })
    .toBuffer({ resolveWithObject: true });
  const expectedContentSize =
    normalizedProductImageSize - normalizedProductImagePadding * 2;

  assert.equal(visibleContent.info.width, expectedContentSize);
  assert.equal(visibleContent.info.height, expectedContentSize / 2);
});

test("normalizes images according to their EXIF orientation", async () => {
  const source = await sharp({
    create: {
      background: "#07552a",
      channels: 3,
      height: minimumProductImageLongSide,
      width: minimumProductImageShortSide,
    },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();

  const normalized = await normalizeProductImage(source);
  const metadata = await sharp(normalized).metadata();

  assert.equal(metadata.width, normalizedProductImageSize);
  assert.equal(metadata.height, normalizedProductImageSize);
});

test("rejects image formats outside JPG, PNG and WEBP", async () => {
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"></svg>',
  );

  await assert.rejects(normalizeProductImage(svg), /JPG, PNG o WEBP/);
});

test("rejects product images below the minimum dimensions", async () => {
  const source = await sharp({
    create: {
      background: "#ffffff",
      channels: 3,
      height: minimumProductImageShortSide - 1,
      width: minimumProductImageLongSide,
    },
  })
    .png()
    .toBuffer();

  await assert.rejects(
    normalizeProductImage(source),
    /al menos 800 × 600 píxeles/,
  );
});

test("normalizes legacy product images below the current minimum dimensions", async () => {
  const source = await sharp({
    create: {
      background: "#ffffff",
      channels: 3,
      height: 300,
      width: 400,
    },
  })
    .png()
    .toBuffer();

  const normalized = await normalizeProductImage(source, {
    enforceMinimumDimensions: false,
  });
  const metadata = await sharp(normalized).metadata();

  assert.equal(metadata.width, normalizedProductImageSize);
  assert.equal(metadata.height, normalizedProductImageSize);
  assert.equal(metadata.format, "webp");
});

test("rejects files whose contents are not valid images", async () => {
  await assert.rejects(
    normalizeProductImage(Buffer.from("not-an-image")),
    /dañada o no se pudo procesar/,
  );
});

test("rejects non-HTTPS product image URLs", async () => {
  await assert.rejects(
    validateRemoteProductImageUrl("http://images.example.com/product.jpg"),
    /URL publica HTTPS/,
  );
});

test("rejects malformed URLs and URLs with credentials", async () => {
  await assert.rejects(
    validateRemoteProductImageUrl("not-a-url", publicLookup),
    /URL de imagen valida/,
  );
  await assert.rejects(
    validateRemoteProductImageUrl(
      "https://user:password@images.example.com/product.jpg",
      publicLookup,
    ),
    /URL publica HTTPS/,
  );
});

test("rejects local product image URLs", async () => {
  await assert.rejects(
    validateRemoteProductImageUrl("https://localhost/product.jpg"),
    /URL publica HTTPS/,
  );
});

test("validates public hosts and rejects private network addresses", async () => {
  const result = await validateRemoteProductImageUrl(
    "https://images.example.com/product.jpg",
    publicLookup,
  );
  assert.equal(result.hostname, "images.example.com");

  for (const address of [
    "10.0.0.1",
    "100.64.0.1",
    "169.254.1.1",
    "172.16.0.1",
    "192.168.1.1",
    "198.18.0.1",
    "224.0.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ]) {
    await assert.rejects(
      validateRemoteProductImageUrl(
        "https://images.example.com/product.jpg",
        async () => [{ address, family: address.includes(":") ? 6 : 4 }],
      ),
      /URL publica HTTPS/,
    );
  }

  await assert.rejects(
    validateRemoteProductImageUrl(
      "https://images.example.com/product.jpg",
      async () => [],
    ),
    /URL publica HTTPS/,
  );
});

test("reports hosts that cannot be resolved", async () => {
  await assert.rejects(
    validateRemoteProductImageUrl(
      "https://missing.example.com/product.jpg",
      async () => {
        throw new Error("DNS failed");
      },
    ),
    /encontrar el servidor/,
  );
});

test("downloads a valid remote product image", async () => {
  const source = Buffer.from("valid-image-body");
  const downloaded = await downloadProductImage(
    "https://images.example.com/product.jpg",
    networkWith(
      async () =>
        new Response(source, {
          headers: {
            "content-length": String(source.length),
            "content-type": "image/jpeg; charset=binary",
          },
        }),
    ),
  );

  assert.deepEqual(downloaded, source);
});

test("follows safe remote image redirects", async () => {
  const requestedUrls = [];
  const downloaded = await downloadProductImage(
    "https://images.example.com/original.jpg",
    networkWith(async (url) => {
      requestedUrls.push(url.toString());
      if (requestedUrls.length === 1) {
        return new Response(null, {
          headers: { location: "/final.webp" },
          status: 302,
        });
      }
      return new Response("redirected-image", {
        headers: { "content-type": "image/webp" },
      });
    }),
  );

  assert.equal(downloaded.toString(), "redirected-image");
  assert.deepEqual(requestedUrls, [
    "https://images.example.com/original.jpg",
    "https://images.example.com/final.webp",
  ]);
});

test("rejects failed downloads and invalid remote responses", async () => {
  await assert.rejects(
    downloadProductImage(
      "https://images.example.com/product.jpg",
      networkWith(async () => {
        throw new Error("network failed");
      }),
    ),
    /descargar la imagen/,
  );
  await assert.rejects(
    downloadProductImage(
      "https://images.example.com/product.jpg",
      networkWith(async () => new Response(null, { status: 404 })),
    ),
    /descargar la imagen/,
  );
  await assert.rejects(
    downloadProductImage(
      "https://images.example.com/product.jpg",
      networkWith(
        async () =>
          new Response("not an image", {
            headers: { "content-type": "text/html" },
          }),
      ),
    ),
    /apuntar directamente a una imagen/,
  );
  await assert.rejects(
    downloadProductImage(
      "https://images.example.com/product.jpg",
      networkWith(
        async () =>
          new Response(null, { headers: { "content-type": "image/png" } }),
      ),
    ),
    /no devolvio una imagen/,
  );
});

test("rejects remote images above the size limit", async () => {
  await assert.rejects(
    downloadProductImage(
      "https://images.example.com/product.jpg",
      networkWith(
        async () =>
          new Response("small body", {
            headers: {
              "content-length": String(maxProductImageSize + 1),
              "content-type": "image/png",
            },
          }),
      ),
    ),
    /5 MB/,
  );

  const oversizedStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(maxProductImageSize + 1));
      controller.close();
    },
  });
  await assert.rejects(
    downloadProductImage(
      "https://images.example.com/product.jpg",
      networkWith(
        async () =>
          new Response(oversizedStream, {
            headers: { "content-type": "image/png" },
          }),
      ),
    ),
    /5 MB/,
  );
});

test("rejects missing redirect locations and redirect loops", async () => {
  await assert.rejects(
    downloadProductImage(
      "https://images.example.com/product.jpg",
      networkWith(async () => new Response(null, { status: 302 })),
    ),
    /demasiadas redirecciones/,
  );

  await assert.rejects(
    downloadProductImage(
      "https://images.example.com/product.jpg",
      networkWith(
        async () =>
          new Response(null, {
            headers: { location: "/again.jpg" },
            status: 302,
          }),
      ),
    ),
    /demasiadas redirecciones/,
  );
});

test("resolves the default and configured product upload directories", () => {
  delete process.env.UPLOAD_DIR;
  assert.equal(
    getProductImageUploadDir(),
    path.resolve(process.cwd(), "public", "uploads", "products"),
  );

  process.env.UPLOAD_DIR = path.join("storage", "product-images");
  assert.equal(
    getProductImageUploadDir(),
    path.resolve("storage", "product-images"),
  );
});
