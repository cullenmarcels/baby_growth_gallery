import { Inject, Injectable } from '@nestjs/common';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

export interface VerificationDeliveryPort {
  send(phoneE164: string, purpose: string, code: string): Promise<void>;
}

@Injectable()
export class VerificationDeliveryService implements VerificationDeliveryPort {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async send(_phoneE164: string, _purpose: string, _code: string): Promise<void> {
    void _phoneE164;
    void _purpose;
    void _code;
    if (this.config.auth.verificationDeliveryMode !== 'fixed') {
      throw new ApiProblemException(
        503,
        'Verification delivery is not configured.',
        'VERIFICATION_DELIVERY_UNAVAILABLE',
      );
    }
    await Promise.resolve();
  }
}
