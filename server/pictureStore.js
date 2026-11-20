// Fotos von Gästen. In Produktion im S3-Bucket (Railway, Bucket „mailcast-audio-bucked“)
// unter S3_PREFIX (Standard „rupibar/pictures/“), lokal ohne Bucket-Variablen in ./data/pictures.
// Ein Index (index.json) hält Name, Zeitpunkt und Status (live / pending) aller Fotos.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const MAX_PICTURES = 300;
export const MAX_BYTES = 8 * 1024 * 1024;
const NAME_LIMIT = 40;

// Nur JPEG, PNG und WebP (an den ersten Bytes erkannt, nicht am mitgeschickten Typ).
export function imageType(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length > 12 && buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

export const cleanName = value => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, NAME_LIMIT);
const validId = id => /^[0-9a-z]{6,40}$/.test(id);

function s3Backend(env) {
  const client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION || 'auto',
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
  });
  const bucket = env.S3_BUCKET;
  const prefix = env.S3_PREFIX || 'rupibar/pictures/';
  const missing = error => error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404;
  return {
    label: `S3 ${bucket}/${prefix}`,
    async read(key) {
      try {
        const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: prefix + key }));
        return Buffer.from(await result.Body.transformToByteArray());
      } catch (error) {
        if (missing(error)) return null;
        throw error;
      }
    },
    write: (key, body, contentType) => client.send(new PutObjectCommand({
      Bucket: bucket, Key: prefix + key, Body: body, ContentType: contentType, CacheControl: 'private, max-age=31536000'
    })),
    remove: key => client.send(new DeleteObjectCommand({ Bucket: bucket, Key: prefix + key }))
  };
}

function localBackend(dir) {
  return {
    label: `lokal ${dir}`,
    async read(key) {
      try { return await fs.readFile(path.join(dir, key)); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    },
    async write(key, body) {
      await fs.mkdir(path.dirname(path.join(dir, key)), { recursive: true });
      await fs.writeFile(path.join(dir, key), body);
    },
    async remove(key) { await fs.rm(path.join(dir, key), { force: true }); }
  };
}

export function createPictureStore(env = process.env, localDir = path.resolve('data/pictures')) {
  const useS3 = Boolean(env.S3_BUCKET && env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY);
  const backend = useS3 ? s3Backend(env) : localBackend(localDir);
  let index = [];
  let queue = Promise.resolve();
  // Änderungen am Index nacheinander ausführen, damit nichts verloren geht.
  const serial = task => (queue = queue.then(task, task));
  const saveIndex = () => backend.write('index.json', Buffer.from(JSON.stringify(index)), 'application/json');

  return {
    label: backend.label,
    async load() {
      const raw = await backend.read('index.json');
      index = raw ? JSON.parse(raw.toString('utf8')).filter(item => validId(item.id)) : [];
      return index.length;
    },
    list: () => index.map(item => ({ ...item })),

    add(buffer, { name, status }) {
      return serial(async () => {
        if (index.length >= MAX_PICTURES) throw Object.assign(new Error('Die Fotowand ist voll. Bitte an der Bar Bescheid sagen.'), { status: 409 });
        const type = imageType(buffer);
        if (!type) throw Object.assign(new Error('Bitte ein Foto (JPEG, PNG oder WebP) hochladen.'), { status: 415 });
        const id = `${Date.now().toString(36)}${crypto.randomBytes(5).toString('hex')}`;
        await backend.write(`img/${id}`, buffer, type);
        const item = { id, name: cleanName(name), at: Date.now(), status, type };
        index = [...index, item];
        await saveIndex();
        return { ...item };
      });
    },

    async image(id) {
      const item = validId(id) && index.find(entry => entry.id === id);
      if (!item) return null;
      const body = await backend.read(`img/${id}`);
      return body && { body, type: item.type };
    },

    approve(id) {
      return serial(async () => {
        if (!index.some(item => item.id === id)) return false;
        index = index.map(item => (item.id === id ? { ...item, status: 'live' } : item));
        await saveIndex();
        return true;
      });
    },

    remove(id) {
      return serial(async () => {
        if (!index.some(item => item.id === id)) return false;
        await backend.remove(`img/${id}`);
        index = index.filter(item => item.id !== id);
        await saveIndex();
        return true;
      });
    }
  };
}
