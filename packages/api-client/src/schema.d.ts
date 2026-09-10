/**
 * Generated from openapi.json. Do not edit by hand.
 */
export interface components {
  schemas: {
    "AccountSummaryDto": {
      "activeFamilyId": string | null;
      "displayName": string | null;
      "id": string;
      "phoneMasked": string;
    };
    "ApiProblemDto": {
      "code"?: string;
      "detail": string;
      "instance": string;
      "status": number;
      "title": string;
      "traceId": string;
      "type": string;
      "violations"?: Array<{
        "code": string;
        "field": string;
      }>;
    };
    "CodeLoginRequestDto": {
      "challengeId": string;
      "code": string;
      "phone": string;
      "remember": boolean;
    };
    "CsrfTokenResponseDto": {
      "csrfToken": string;
    };
    "DependencyHealthDto": {
      "objectStorage": "up" | "down";
      "postgres": "up" | "down";
      "redis": "up" | "down";
    };
    "HealthResponseDto": {
      "dependencies"?: components['schemas']['DependencyHealthDto'];
      "service": string;
      "status": "ok";
      "timestamp": string;
      "version": string;
    };
    "PasswordLoginRequestDto": {
      "password": string;
      "phone": string;
      "remember": boolean;
    };
    "PasswordResetRequestDto": {
      "challengeId": string;
      "code": string;
      "newPassword": string;
      "phone": string;
    };
    "RegisterRequestDto": {
      "challengeId": string;
      "code": string;
      "password": string;
      "phone": string;
      "privacyVersion": string;
      "termsVersion": string;
    };
    "VerificationChallengeRequestDto": {
      "phone": string;
      "purpose": "REGISTER" | "LOGIN" | "RESET_PASSWORD";
    };
    "VerificationChallengeResponseDto": {
      "challengeId": string;
      "expiresInSeconds": number;
      "resendAfterSeconds": number;
    };
  };
}

export interface paths {
  "/api/v1/auth/csrf": {
    get: {
      responses: {
        "200": {
          content: {
            "application/json": components['schemas']['CsrfTokenResponseDto'];
          };
        };
        "400": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "401": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "403": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "429": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "503": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/auth/login/code": {
    post: {
      requestBody: {
        content: {
          "application/json": components['schemas']['CodeLoginRequestDto'];
        };
      };
      responses: {
        "200": {
          content: {
            "application/json": components['schemas']['AccountSummaryDto'];
          };
        };
        "400": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "401": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "403": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "429": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "503": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/auth/login/password": {
    post: {
      requestBody: {
        content: {
          "application/json": components['schemas']['PasswordLoginRequestDto'];
        };
      };
      responses: {
        "200": {
          content: {
            "application/json": components['schemas']['AccountSummaryDto'];
          };
        };
        "400": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "401": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "403": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "429": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "503": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/auth/logout": {
    post: {
      responses: {
        "204": {
          content: Record<string, never>;
        };
        "400": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "401": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "403": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "429": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "503": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/auth/password/reset": {
    post: {
      requestBody: {
        content: {
          "application/json": components['schemas']['PasswordResetRequestDto'];
        };
      };
      responses: {
        "204": {
          content: Record<string, never>;
        };
        "400": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "401": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "403": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "429": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "503": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/auth/register": {
    post: {
      requestBody: {
        content: {
          "application/json": components['schemas']['RegisterRequestDto'];
        };
      };
      responses: {
        "201": {
          content: {
            "application/json": components['schemas']['AccountSummaryDto'];
          };
        };
        "400": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "401": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "403": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "429": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "503": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/auth/session": {
    get: {
      responses: {
        "200": {
          content: {
            "application/json": components['schemas']['AccountSummaryDto'];
          };
        };
        "400": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "401": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "403": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "429": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "503": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/auth/verification-challenges": {
    post: {
      requestBody: {
        content: {
          "application/json": components['schemas']['VerificationChallengeRequestDto'];
        };
      };
      responses: {
        "202": {
          content: {
            "application/json": components['schemas']['VerificationChallengeResponseDto'];
          };
        };
        "400": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "401": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "403": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "429": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "503": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/health/live": {
    get: {
      responses: {
        "200": {
          content: {
            "application/json": components['schemas']['HealthResponseDto'];
          };
        };
      };
    };
  };
  "/api/v1/health/ready": {
    get: {
      responses: {
        "200": {
          content: {
            "application/json": components['schemas']['HealthResponseDto'];
          };
        };
        "503": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
}

export type operations = Record<string, never>;
