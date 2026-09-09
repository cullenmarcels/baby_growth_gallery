/**
 * Generated from openapi.json. Do not edit by hand.
 */
export interface components {
  schemas: {
    "ApiProblemDto": {
      "detail": string;
      "instance": string;
      "status": number;
      "title": string;
      "traceId": string;
      "type": string;
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
  };
}

export interface paths {
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
