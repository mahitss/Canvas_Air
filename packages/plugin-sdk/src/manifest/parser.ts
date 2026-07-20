import { PluginManifest } from "../types";
import { PluginValidationException } from "../errors";

export const MANIFEST_JSON_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": { "type": "string", "pattern": "^[a-zA-Z0-9-_]+$" },
    "name": { "type": "string" },
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+(-.+)?$" },
    "author": { "type": "string" },
    "description": { "type": "string" },
    "permissions": {
      "type": "array",
      "items": { "type": "string" }
    },
    "dependencies": {
      "type": "object",
      "additionalProperties": { "type": "string" }
    },
    "minimumPlatformVersion": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+(-.+)?$" },
    "entryPoint": { "type": "string" }
  },
  "required": [
    "id",
    "name",
    "version",
    "author",
    "description",
    "permissions",
    "dependencies",
    "minimumPlatformVersion",
    "entryPoint"
  ],
  "additionalProperties": false
};

export class ManifestParser {
  /**
   * Parses and validates a raw JSON string into a structured PluginManifest.
   */
  public static parse(jsonString: string): PluginManifest {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err: any) {
      throw new PluginValidationException("Invalid JSON format", [err.message]);
    }

    const errors = this.validate(parsed);
    if (errors.length > 0) {
      throw new PluginValidationException("Manifest validation failed", errors);
    }

    return parsed as PluginManifest;
  }

  /**
   * Validates target object fields against schema criteria, returning accumulated error messages.
   */
  public static validate(obj: any): string[] {
    const errors: string[] = [];

    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      return ["Manifest must be a JSON object"];
    }

    // Verify required fields
    const required = [
      "id",
      "name",
      "version",
      "author",
      "description",
      "permissions",
      "dependencies",
      "minimumPlatformVersion",
      "entryPoint"
    ];

    for (const key of required) {
      if (!(key in obj)) {
        errors.push(`Missing required field: '${key}'`);
      }
    }

    // Type and regex validations if fields exist
    if (obj.id !== undefined) {
      if (typeof obj.id !== "string" || !/^[a-zA-Z0-9-_]+$/.test(obj.id)) {
        errors.push("Field 'id' must be a alphanumeric string containing only hyphens, underscores, or numbers");
      }
    }

    if (obj.name !== undefined && typeof obj.name !== "string") {
      errors.push("Field 'name' must be a string");
    }

    const semverRegex = /^\d+\.\d+\.\d+(-.+)?$/;

    if (obj.version !== undefined) {
      if (typeof obj.version !== "string" || !semverRegex.test(obj.version)) {
        errors.push("Field 'version' must be a valid SemVer string (e.g. '1.0.0')");
      }
    }

    if (obj.author !== undefined && typeof obj.author !== "string") {
      errors.push("Field 'author' must be a string");
    }

    if (obj.description !== undefined && typeof obj.description !== "string") {
      errors.push("Field 'description' must be a string");
    }

    if (obj.permissions !== undefined) {
      if (!Array.isArray(obj.permissions) || obj.permissions.some((p: any) => typeof p !== "string")) {
        errors.push("Field 'permissions' must be an array of strings");
      }
    }

    if (obj.dependencies !== undefined) {
      if (typeof obj.dependencies !== "object" || Array.isArray(obj.dependencies)) {
        errors.push("Field 'dependencies' must be a key-value record of strings");
      } else {
        for (const [depId, depVer] of Object.entries(obj.dependencies)) {
          if (typeof depVer !== "string") {
            errors.push(`Dependency '${depId}' version constraint must be a string`);
          }
        }
      }
    }

    if (obj.minimumPlatformVersion !== undefined) {
      if (typeof obj.minimumPlatformVersion !== "string" || !semverRegex.test(obj.minimumPlatformVersion)) {
        errors.push("Field 'minimumPlatformVersion' must be a valid SemVer string (e.g. '1.2.0')");
      }
    }

    if (obj.entryPoint !== undefined && typeof obj.entryPoint !== "string") {
      errors.push("Field 'entryPoint' must be a string");
    }

    // Check for extraneous keys to match additionalProperties: false schema check
    const allowedKeys = new Set(required);
    for (const key of Object.keys(obj)) {
      if (!allowedKeys.has(key)) {
        errors.push(`Extraneous property '${key}' is not allowed`);
      }
    }

    return errors;
  }
}
