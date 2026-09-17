import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

@Injectable()
export class ObjectStorageService implements OnModuleDestroy {
  private readonly internal: S3Client;
  private readonly public: S3Client;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    const base = {
      region: config.s3.region,
      forcePathStyle: config.s3.forcePathStyle,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
    };
    this.internal = new S3Client({ ...base, endpoint: config.s3.endpoint });
    this.public = new S3Client({ ...base, endpoint: config.s3.publicEndpoint });
  }

  onModuleDestroy(): void {
    this.internal.destroy();
    this.public.destroy();
  }

  async headBucket(): Promise<void> {
    await this.internal.send(new HeadBucketCommand({ Bucket: this.config.s3.bucket }));
  }

  async createUpload(
    key: string,
    contentType: string,
    maxExpiresSeconds = 600,
  ): Promise<{
    url: string;
    fields: Record<string, string>;
    expiresAt: string;
  }> {
    const expiresSeconds = Math.max(1, Math.min(600, Math.floor(maxExpiresSeconds)));
    const post = await createPresignedPost(this.public, {
      Bucket: this.config.s3.bucket,
      Key: key,
      Expires: expiresSeconds,
      Fields: { 'Content-Type': contentType },
      Conditions: [
        ['eq', '$key', key],
        ['eq', '$Content-Type', contentType],
        ['content-length-range', 1, MAX_SOURCE_BYTES],
      ],
    });
    return {
      url: post.url,
      fields: post.fields,
      expiresAt: new Date(Date.now() + expiresSeconds * 1000).toISOString(),
    };
  }

  async head(key: string): Promise<{ size: number; contentType: string | null }> {
    const response = await this.internal.send(
      new HeadObjectCommand({ Bucket: this.config.s3.bucket, Key: key }),
    );
    return {
      size: Number(response.ContentLength ?? 0),
      contentType: response.ContentType ?? null,
    };
  }

  async getBuffer(key: string): Promise<Buffer> {
    const response = await this.internal.send(
      new GetObjectCommand({ Bucket: this.config.s3.bucket, Key: key }),
    );
    if (!response.Body) throw new Error('Object body is unavailable');
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async putWebp(key: string, body: Buffer): Promise<void> {
    await this.internal.send(
      new PutObjectCommand({
        Bucket: this.config.s3.bucket,
        Key: key,
        Body: body,
        ContentType: 'image/webp',
        CacheControl: 'private, max-age=31536000, immutable',
      }),
    );
  }

  async delete(key: string | null | undefined): Promise<void> {
    if (!key) return;
    await this.internal.send(new DeleteObjectCommand({ Bucket: this.config.s3.bucket, Key: key }));
  }

  async signPrivateGet(key: string): Promise<{ url: string; expiresAt: string }> {
    const expiresSeconds = 300;
    const url = await getSignedUrl(
      this.public,
      new GetObjectCommand({ Bucket: this.config.s3.bucket, Key: key }),
      { expiresIn: expiresSeconds },
    );
    return { url, expiresAt: new Date(Date.now() + expiresSeconds * 1000).toISOString() };
  }
}
