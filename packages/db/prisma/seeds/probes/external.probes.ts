import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import type { Probe } from './probe.types';

export const s3Probe: Probe = {
  name: 's3',
  criticality: 'p1',
  timeoutMs: 10_000,
  run: async (signal) => {
    const start = performance.now();
    const bucket = process.env.AWS_S3_EXPORT_BUCKET;
    if (!bucket)
      return {
        name: 's3',
        status: 'yellow',
        latencyMs: 0,
        message: 'AWS_S3_EXPORT_BUCKET not set',
        timestamp: new Date(),
      };
    const client = new S3Client({ region: process.env.AWS_REGION ?? 'ap-south-1' });
    const key = `probes/datun-seed-${Date.now()}.txt`;
    const body = 'datun-seed probe';
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }), {
      abortSignal: signal,
    });
    const got = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }), {
      abortSignal: signal,
    });
    const text = await got.Body?.transformToString();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), {
      abortSignal: signal,
    });
    return {
      name: 's3',
      status: text === body ? 'green' : 'red',
      latencyMs: Math.round(performance.now() - start),
      message: text === body ? 'Roundtrip OK' : 'Body mismatch',
      timestamp: new Date(),
    };
  },
};

export const aiProviderProbe: Probe = {
  name: 'ai-provider',
  criticality: 'p0',
  timeoutMs: 15_000,
  run: async (signal) => {
    const start = performance.now();
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key)
      return {
        name: 'ai-provider',
        status: 'red',
        latencyMs: 0,
        message: 'ANTHROPIC_API_KEY missing',
        timestamp: new Date(),
      };
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });
    return {
      name: 'ai-provider',
      status: res.ok ? 'green' : 'red',
      latencyMs: Math.round(performance.now() - start),
      message: res.ok ? 'Anthropic API responsive' : `HTTP ${res.status}`,
      timestamp: new Date(),
    };
  },
};
