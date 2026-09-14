/**
 * Generated from openapi.json. Do not edit by hand.
 */
export interface components {
  schemas: {
    "AcceptInvitationRequestDto": {
      "displayName": string;
      "token": string;
    };
    "AcceptInvitationResponseDto": {
      "account": components['schemas']['AccountSummaryDto'];
      "family": components['schemas']['FamilySummaryDto'];
    };
    "AccountSummaryDto": {
      "activeFamilyId": string | null;
      "displayName": string | null;
      "id": string;
      "phoneMasked": string;
    };
    "ActiveFamilyActivityItemDto": {
      "actor": components['schemas']['ActivityActorDto'];
      "id": string;
      "occurredAt": string;
      "schemaVersion": number;
      "subject"?: components['schemas']['ActivitySubjectDto'];
      "summary": (components['schemas']['FamilyCreatedSummaryDto'] | components['schemas']['MemberJoinedSummaryDto'] | components['schemas']['MemberRoleChangedSummaryDto'] | components['schemas']['MemberLeftSummaryDto']);
      "type": "FAMILY_CREATED" | "MEMBER_JOINED" | "MEMBER_ROLE_CHANGED" | "MEMBER_LEFT" | "PHOTO_UPLOADED" | "COMMENT_ADDED" | "REACTION_ADDED" | "MILESTONE_RECORDED" | "GROWTH_RECORDED";
      "visibility": "ACTIVE";
    };
    "ActiveInvitationDto": {
      "createdAt": string;
      "createdBy": components['schemas']['InvitationCreatorDto'];
      "expiresAt": string;
      "id": string;
    };
    "ActivityActorDto": {
      "displayName": string;
      "membershipId": string | null;
    };
    "ActivitySubjectDto": {
      "id": string;
      "type": string;
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
    "ChangeMemberRoleRequestDto": {
      "role": "ADMIN" | "MEMBER";
    };
    "CodeLoginRequestDto": {
      "challengeId": string;
      "code": string;
      "phone": string;
      "remember": boolean;
    };
    "CreatedInvitationDto": {
      "invitation": components['schemas']['ActiveInvitationDto'];
      "token": string;
    };
    "CreateFamilyRequestDto": {
      "displayName": string;
      "name": string;
    };
    "CsrfTokenResponseDto": {
      "csrfToken": string;
    };
    "DependencyHealthDto": {
      "objectStorage": "up" | "down";
      "postgres": "up" | "down";
      "redis": "up" | "down";
    };
    "FamilyActivityPageDto": {
      "items": Array<(components['schemas']['ActiveFamilyActivityItemDto'] | components['schemas']['TombstonedFamilyActivityItemDto'])>;
      "nextCursor": string | null;
    };
    "FamilyCreatedSummaryDto": {
      "familyName": string;
    };
    "FamilyListResponseDto": {
      "items": Array<components['schemas']['FamilySummaryDto']>;
    };
    "FamilyMemberDto": {
      "displayName": string;
      "id": string;
      "isCurrentAccount": boolean;
      "joinedAt": string;
      "role": "OWNER" | "ADMIN" | "MEMBER";
      "status": "ACTIVE";
    };
    "FamilyMemberListResponseDto": {
      "items": Array<components['schemas']['FamilyMemberDto']>;
    };
    "FamilyMembershipSummaryDto": {
      "displayName": string;
      "id": string;
      "role": "OWNER" | "ADMIN" | "MEMBER";
    };
    "FamilySummaryDto": {
      "createdAt": string;
      "currentMembership": components['schemas']['FamilyMembershipSummaryDto'];
      "id": string;
      "name": string;
    };
    "HealthResponseDto": {
      "dependencies"?: components['schemas']['DependencyHealthDto'];
      "service": string;
      "status": "ok";
      "timestamp": string;
      "version": string;
    };
    "InvitationCreatorDto": {
      "displayName": string;
      "membershipId": string;
    };
    "InvitationListResponseDto": {
      "items": Array<components['schemas']['ActiveInvitationDto']>;
    };
    "MemberJoinedSummaryDto": {
      "displayName": string;
      "joinKind": "NEW" | "REJOINED";
      "membershipId": string;
      "role": "OWNER" | "ADMIN" | "MEMBER";
    };
    "MemberLeftSummaryDto": {
      "displayName": string;
      "membershipId": string;
      "reason": "LEFT" | "REMOVED";
    };
    "MemberRoleChangedSummaryDto": {
      "displayName": string;
      "fromRole": "OWNER" | "ADMIN" | "MEMBER";
      "membershipId": string;
      "toRole": "OWNER" | "ADMIN" | "MEMBER";
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
    "TombstonedFamilyActivityItemDto": {
      "id": string;
      "message": string;
      "occurredAt": string;
      "type": "CONTENT_DELETED";
      "visibility": "TOMBSTONED";
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
  "/api/v1/families": {
    get: {
      responses: {
        "200": {
          content: {
            "application/json": components['schemas']['FamilyListResponseDto'];
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
        "404": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "409": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          "application/json": components['schemas']['CreateFamilyRequestDto'];
        };
      };
      responses: {
        "201": {
          content: {
            "application/json": components['schemas']['FamilySummaryDto'];
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
        "404": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "409": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/families/{familyId}": {
    get: {
      parameters: {
        "path": {
          "familyId": string;
        };
      };
      responses: {
        "200": {
          content: {
            "application/json": components['schemas']['FamilySummaryDto'];
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
        "404": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "409": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/families/{familyId}/activate": {
    post: {
      parameters: {
        "path": {
          "familyId": string;
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
        "404": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "409": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/families/{familyId}/activities": {
    get: {
      parameters: {
        "path": {
          "familyId": string;
        };
        "query"?: {
          "cursor"?: string;
          "limit"?: number;
        };
      };
      responses: {
        "200": {
          content: {
            "application/json": components['schemas']['FamilyActivityPageDto'];
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
        "404": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "409": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/families/{familyId}/invitations": {
    get: {
      parameters: {
        "path": {
          "familyId": string;
        };
      };
      responses: {
        "200": {
          content: {
            "application/json": components['schemas']['InvitationListResponseDto'];
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
        "404": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "409": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
    post: {
      parameters: {
        "path": {
          "familyId": string;
        };
      };
      responses: {
        "201": {
          content: {
            "application/json": components['schemas']['CreatedInvitationDto'];
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
        "404": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "409": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/families/{familyId}/invitations/{invitationId}": {
    delete: {
      parameters: {
        "path": {
          "familyId": string;
          "invitationId": string;
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
        "404": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "409": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/families/{familyId}/members": {
    get: {
      parameters: {
        "path": {
          "familyId": string;
        };
      };
      responses: {
        "200": {
          content: {
            "application/json": components['schemas']['FamilyMemberListResponseDto'];
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
        "404": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "409": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/families/{familyId}/members/{membershipId}": {
    delete: {
      parameters: {
        "path": {
          "familyId": string;
          "membershipId": string;
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
        "404": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "409": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/families/{familyId}/members/{membershipId}/role": {
    patch: {
      parameters: {
        "path": {
          "familyId": string;
          "membershipId": string;
        };
      };
      requestBody: {
        content: {
          "application/json": components['schemas']['ChangeMemberRoleRequestDto'];
        };
      };
      responses: {
        "200": {
          content: {
            "application/json": components['schemas']['FamilyMemberDto'];
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
        "404": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "409": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/families/{familyId}/membership": {
    delete: {
      parameters: {
        "path": {
          "familyId": string;
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
        "404": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
        "409": {
          content: {
            "application/problem+json": components['schemas']['ApiProblemDto'];
          };
        };
      };
    };
  };
  "/api/v1/family-invitations/accept": {
    post: {
      requestBody: {
        content: {
          "application/json": components['schemas']['AcceptInvitationRequestDto'];
        };
      };
      responses: {
        "200": {
          content: {
            "application/json": components['schemas']['AcceptInvitationResponseDto'];
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
        "409": {
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
