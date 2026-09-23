import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  applyDecorators,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiExtraModels,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { parseBody } from '../auth/auth.schemas.js';
import { AuthSessionService } from '../auth/session.service.js';
import { familyIdSchema } from '../family/family.schemas.js';
import {
  BatchUpdatePhotosRequestDto,
  CreatePhotoBatchRequestDto,
  PhotoListResponseDto,
  PhotoManagementPageDto,
  PublishedPhotoDetailDto,
  PublishedPhotoPageDto,
  PhotoPreviewDto,
  PhotoSummaryDto,
  PhotoUploadBatchDto,
  PhotoUploadInstructionDto,
  PublishPhotosRequestDto,
  TimelinePageDto,
  TimelineMilestoneEntryDto,
  TimelinePhotoEntryDto,
  UpdatePhotoRequestDto,
} from './photo.dto.js';
import {
  batchUpdatePhotosSchema,
  createPhotoBatchSchema,
  managePhotosQuerySchema,
  photoBatchIdSchema,
  photoIdSchema,
  previewQuerySchema,
  publishedPhotosQuerySchema,
  publishPhotosSchema,
  updatePhotoSchema,
} from './photo.schemas.js';
import { PhotoService } from './photo.service.js';

const FamilyBabyParams = () =>
  applyDecorators(
    ApiParam({ name: 'familyId', type: String, format: 'uuid' }),
    ApiParam({ name: 'babyId', type: String, format: 'uuid' }),
  );
const BatchParams = () =>
  applyDecorators(FamilyBabyParams(), ApiParam({ name: 'batchId', type: String, format: 'uuid' }));
const BatchPhotoParams = () =>
  applyDecorators(BatchParams(), ApiParam({ name: 'photoId', type: String, format: 'uuid' }));
const PhotoParams = () =>
  applyDecorators(FamilyBabyParams(), ApiParam({ name: 'photoId', type: String, format: 'uuid' }));

@ApiTags('photos')
@ApiCookieAuth()
@ApiExtraModels(TimelinePhotoEntryDto, TimelineMilestoneEntryDto)
@Controller('families/:familyId/babies/:babyId')
export class PhotoController {
  constructor(
    @Inject(PhotoService) private readonly photos: PhotoService,
    @Inject(AuthSessionService) private readonly sessions: AuthSessionService,
  ) {}

  @Post('photo-upload-batches')
  @FamilyBabyParams()
  @ApiBody({ type: CreatePhotoBatchRequestDto })
  @ApiResponse({ status: 201, type: PhotoUploadBatchDto })
  async createBatch(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const account = await this.sessions.current(request);
    return this.photos.createBatch(
      account.id,
      request.ip || request.socket.remoteAddress || 'unknown',
      this.uuid(family),
      this.uuid(baby),
      parseBody(createPhotoBatchSchema, body),
    );
  }

  @Get('photo-upload-batches/:batchId')
  @BatchParams()
  @ApiResponse({ status: 200, type: PhotoUploadBatchDto })
  async getBatch(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('batchId') batch: string,
    @Req() request: Request,
  ) {
    const account = await this.sessions.current(request);
    return this.photos.getBatch(
      account.id,
      this.uuid(family),
      this.uuid(baby),
      parseBody(photoBatchIdSchema, batch),
    );
  }

  @Post('photo-upload-batches/:batchId/photos/:photoId/reissue')
  @BatchPhotoParams()
  @HttpCode(200)
  @ApiResponse({ status: 200, type: PhotoUploadInstructionDto })
  async reissue(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('batchId') batch: string,
    @Param('photoId') photo: string,
    @Req() request: Request,
  ) {
    const account = await this.sessions.current(request);
    return this.photos.reissue(
      account.id,
      this.uuid(family),
      this.uuid(baby),
      parseBody(photoBatchIdSchema, batch),
      parseBody(photoIdSchema, photo),
    );
  }

  @Post('photo-upload-batches/:batchId/photos/:photoId/complete')
  @BatchPhotoParams()
  @HttpCode(202)
  @ApiResponse({ status: 202 })
  async complete(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('batchId') batch: string,
    @Param('photoId') photo: string,
    @Req() request: Request,
  ) {
    const account = await this.sessions.current(request);
    await this.photos.complete(
      account.id,
      this.uuid(family),
      this.uuid(baby),
      parseBody(photoBatchIdSchema, batch),
      parseBody(photoIdSchema, photo),
    );
    return { accepted: true };
  }

  @Patch('photo-upload-batches/:batchId/photos')
  @BatchParams()
  @ApiBody({ type: BatchUpdatePhotosRequestDto })
  @ApiResponse({ status: 200, type: PhotoListResponseDto })
  async batchUpdate(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('batchId') batch: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const account = await this.sessions.current(request);
    return this.photos.batchUpdate(
      account.id,
      this.uuid(family),
      this.uuid(baby),
      parseBody(photoBatchIdSchema, batch),
      parseBody(batchUpdatePhotosSchema, body),
    );
  }

  @Post('photo-upload-batches/:batchId/publish')
  @BatchParams()
  @HttpCode(200)
  @ApiBody({ type: PublishPhotosRequestDto })
  @ApiResponse({ status: 200, type: PhotoListResponseDto })
  async publish(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('batchId') batch: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const account = await this.sessions.current(request);
    return this.photos.publish(
      account.id,
      this.uuid(family),
      this.uuid(baby),
      parseBody(photoBatchIdSchema, batch),
      parseBody(publishPhotosSchema, body),
    );
  }

  @Get('photos/manage')
  @FamilyBabyParams()
  @ApiQuery({ name: 'scope', required: false, enum: ['mine', 'family'] })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiResponse({ status: 200, type: PhotoManagementPageDto })
  async manage(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Query() query: unknown,
    @Req() request: Request,
  ) {
    const account = await this.sessions.current(request);
    return this.photos.manage(
      account.id,
      this.uuid(family),
      this.uuid(baby),
      parseBody(managePhotosQuerySchema, query),
    );
  }

  @Get('photos/published')
  @FamilyBabyParams()
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiResponse({ status: 200, type: PublishedPhotoPageDto })
  async published(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Query() query: unknown,
    @Req() request: Request,
  ): Promise<PublishedPhotoPageDto> {
    const account = await this.sessions.current(request);
    return this.photos.published(
      account.id,
      this.uuid(family),
      this.uuid(baby),
      parseBody(publishedPhotosQuerySchema, query),
    );
  }

  @Get('timeline')
  @FamilyBabyParams()
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiResponse({ status: 200, type: TimelinePageDto })
  async timeline(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Query() query: unknown,
    @Req() request: Request,
  ): Promise<TimelinePageDto> {
    const account = await this.sessions.current(request);
    return this.photos.timeline(
      account.id,
      this.uuid(family),
      this.uuid(baby),
      parseBody(publishedPhotosQuerySchema, query),
    );
  }

  @Get('photos/:photoId')
  @PhotoParams()
  @ApiResponse({ status: 200, type: PublishedPhotoDetailDto })
  async publishedDetail(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('photoId') photo: string,
    @Req() request: Request,
  ): Promise<PublishedPhotoDetailDto> {
    const account = await this.sessions.current(request);
    return this.photos.publishedDetail(
      account.id,
      this.uuid(family),
      this.uuid(baby),
      parseBody(photoIdSchema, photo),
    );
  }

  @Patch('photos/:photoId')
  @PhotoParams()
  @ApiBody({ type: UpdatePhotoRequestDto })
  @ApiResponse({ status: 200, type: PhotoSummaryDto })
  async update(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('photoId') photo: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const account = await this.sessions.current(request);
    return this.photos.update(
      account.id,
      this.uuid(family),
      this.uuid(baby),
      parseBody(photoIdSchema, photo),
      parseBody(updatePhotoSchema, body),
    );
  }

  @Get('photos/:photoId/preview')
  @PhotoParams()
  @ApiQuery({ name: 'variant', required: false, enum: ['THUMBNAIL', 'DISPLAY', 'ARCHIVE'] })
  @ApiResponse({ status: 200, type: PhotoPreviewDto })
  async preview(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('photoId') photo: string,
    @Query() query: unknown,
    @Req() request: Request,
  ) {
    const account = await this.sessions.current(request);
    const parsed = parseBody(previewQuerySchema, query);
    return this.photos.preview(
      account.id,
      this.uuid(family),
      this.uuid(baby),
      parseBody(photoIdSchema, photo),
      parsed.variant,
    );
  }

  @Post('photos/:photoId/trash')
  @PhotoParams()
  @HttpCode(200)
  @ApiResponse({ status: 200, type: PhotoSummaryDto })
  async trash(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('photoId') photo: string,
    @Req() request: Request,
  ) {
    const account = await this.sessions.current(request);
    return this.photos.trash(
      account.id,
      this.uuid(family),
      this.uuid(baby),
      parseBody(photoIdSchema, photo),
    );
  }

  @Post('photos/:photoId/restore')
  @PhotoParams()
  @HttpCode(200)
  @ApiResponse({ status: 200, type: PhotoSummaryDto })
  async restore(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('photoId') photo: string,
    @Req() request: Request,
  ) {
    const account = await this.sessions.current(request);
    return this.photos.restore(
      account.id,
      this.uuid(family),
      this.uuid(baby),
      parseBody(photoIdSchema, photo),
    );
  }

  @Delete('photos/:photoId')
  @PhotoParams()
  @HttpCode(204)
  async discard(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('photoId') photo: string,
    @Req() request: Request,
  ): Promise<void> {
    const account = await this.sessions.current(request);
    await this.photos.discard(
      account.id,
      this.uuid(family),
      this.uuid(baby),
      parseBody(photoIdSchema, photo),
    );
  }

  private uuid(value: string): string {
    return parseBody(familyIdSchema, value);
  }
}
