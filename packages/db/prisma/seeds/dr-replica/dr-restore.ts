// ═══════════════════════════════════════════════════════════════
// DR RESTORE — pull latest snapshot from S3, restore to target DB
// Target RTO: <30 minutes (AWS Pilot Light pattern)
// ═══════════════════════════════════════════════════════════════
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { execFileSync } from 'node:child_process';
import { writeFileSync, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';

export interface DrRestoreOptions {
  bucket: string;
  prefix: string;
  targetDatabaseUrl: string;
  truncateFirst?: boolean;
}

export interface DrRestoreResult {
  snapshotKey: string;
  bytesRestored: number;
  durationMs: number;
  rtoSeconds: number;
}

export async function drRestore(opts: DrRestoreOptions): Promise<DrRestoreResult> {
  const start = performance.now();
  const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'ap-south-1' });
  const list = await s3.send(
    new ListObjectsV2Command({ Bucket: opts.bucket, Prefix: opts.prefix }),
  );
  const latest = list.Contents?.sort(
    (a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0),
  )[0];
  if (!latest?.Key) throw new Error('No snapshots found');
  const get = await s3.send(new GetObjectCommand({ Bucket: opts.bucket, Key: latest.Key }));
  const tmpFile = `./tmp/dr-restore-${Date.now()}.sql`;
  await pipeline(get.Body as NodeJS.ReadableStream, createGunzip(), createWriteStream(tmpFile));
  if (opts.truncateFirst) {
    execFileSync(
      'psql',
      [opts.targetDatabaseUrl, '-c', 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'],
      { stdio: 'inherit' },
    );
  }
  execFileSync('psql', [opts.targetDatabaseUrl, '-f', tmpFile], { stdio: 'inherit' });
  const durationMs = Math.round(performance.now() - start);
  return {
    snapshotKey: latest.Key,
    bytesRestored: latest.Size ?? 0,
    durationMs,
    rtoSeconds: Math.round(durationMs / 1000),
  };
}
