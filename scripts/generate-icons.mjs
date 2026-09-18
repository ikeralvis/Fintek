import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'public', 'logo.png');

async function main() {
  // app/icon.png — icono general (App Router lo detecta por convención de nombre).
  // 'contain' + fondo transparente: el logo ya es un squircle centrado con margen,
  // así que no hace falta recortar, solo encajarlo en un lienzo cuadrado.
  await sharp(source)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(root, 'app', 'icon.png'));

  // app/apple-icon.png — iOS no respeta la transparencia (la pinta de blanco), así que
  // se rellena con el mismo tono oscuro del propio squircle del logo.
  await sharp(source)
    .resize(180, 180, { fit: 'contain', background: '#0f172a' })
    .flatten({ background: '#0f172a' })
    .png()
    .toFile(path.join(root, 'app', 'apple-icon.png'));

  // app/favicon.ico — favicon.ico real (contenedor ICO válido, no un PNG renombrado).
  const png32 = await sharp(source)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  writeFileSync(path.join(root, 'app', 'favicon.ico'), buildIco(png32));

  // public/icon-192.png y public/icon-512.png — mismo recorte cuadrado, para que el manifest
  // de la PWA (public/manifest.json) deje de usar el logo.png sin recortar (942x1060, no
  // cuadrado) y las plataformas no lo estiren de forma distinta al favicon/app-icon.
  for (const size of [192, 512]) {
    await sharp(source)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(root, 'public', `icon-${size}.png`));
  }

  console.log('Iconos generados: app/icon.png, app/apple-icon.png, app/favicon.ico, public/icon-192.png, public/icon-512.png');
}

/** Envuelve un PNG en un contenedor ICO de una sola imagen (soportado desde Windows Vista
 *  y por todos los navegadores modernos) — evita depender de un códec BMP/ICO nativo. */
function buildIco(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(1, 4); // image count

  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0); // width (0 = 256, but 32 is fine as literal)
  entry.writeUInt8(32, 1); // height
  entry.writeUInt8(0, 2); // color palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // image data size
  entry.writeUInt32LE(header.length + entry.length, 12); // offset

  return Buffer.concat([header, entry, pngBuffer]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
