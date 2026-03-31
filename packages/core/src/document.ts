import type { UniverseLayoutModel, UniverseModel } from "./types";
import { validateUniverseModel } from "./validation";

export const ZONEFLOW_DOCUMENT_KIND = "zoneflow/universe";
export const ZONEFLOW_DOCUMENT_VERSION = 1;

export type ZoneflowDocument = {
  kind: typeof ZONEFLOW_DOCUMENT_KIND;
  formatVersion: typeof ZONEFLOW_DOCUMENT_VERSION;
  exportedAt: string;
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertUniverseShape(
  value: unknown,
  key: "model" | "layoutModel"
): asserts value is UniverseModel | UniverseLayoutModel {
  if (!isRecord(value)) {
    throw new Error(`Invalid zoneflow document: "${key}" must be an object.`);
  }

  if (typeof value.universeId !== "string" || typeof value.version !== "string") {
    throw new Error(
      `Invalid zoneflow document: "${key}" must include string "universeId" and "version".`
    );
  }
}

function validateLayoutModel(layoutModel: UniverseLayoutModel): string[] {
  const errors: string[] = [];

  if (!isRecord(layoutModel.zoneLayoutsById)) {
    errors.push(`layoutModel.zoneLayoutsById must be an object`);
  }

  if (!isRecord(layoutModel.pathLayoutsById)) {
    errors.push(`layoutModel.pathLayoutsById must be an object`);
  }

  return errors;
}

export function createZoneflowDocument(params: {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  exportedAt?: string;
}): ZoneflowDocument {
  return {
    kind: ZONEFLOW_DOCUMENT_KIND,
    formatVersion: ZONEFLOW_DOCUMENT_VERSION,
    exportedAt: params.exportedAt ?? new Date().toISOString(),
    model: structuredClone(params.model),
    layoutModel: structuredClone(params.layoutModel),
  };
}

export function serializeZoneflowDocument(
  params: {
    model: UniverseModel;
    layoutModel: UniverseLayoutModel;
    exportedAt?: string;
  },
  space = 2
): string {
  return JSON.stringify(createZoneflowDocument(params), null, space);
}

export function readZoneflowDocument(input: unknown): ZoneflowDocument {
  if (!isRecord(input)) {
    throw new Error("Invalid zoneflow document: root must be an object.");
  }

  const isLegacyBundle =
    !("kind" in input) &&
    "model" in input &&
    "layoutModel" in input;

  if (!isLegacyBundle) {
    if (input.kind !== ZONEFLOW_DOCUMENT_KIND) {
      throw new Error(
        `Invalid zoneflow document: "kind" must be "${ZONEFLOW_DOCUMENT_KIND}".`
      );
    }

    if (input.formatVersion !== ZONEFLOW_DOCUMENT_VERSION) {
      throw new Error(
        `Unsupported zoneflow document version: "${String(input.formatVersion)}".`
      );
    }
  }

  assertUniverseShape(input.model, "model");
  assertUniverseShape(input.layoutModel, "layoutModel");

  const model = structuredClone(input.model) as UniverseModel;
  const layoutModel = structuredClone(input.layoutModel) as UniverseLayoutModel;

  if (layoutModel.universeId !== model.universeId) {
    throw new Error(
      "Invalid zoneflow document: model.universeId and layoutModel.universeId must match."
    );
  }

  const modelErrors = validateUniverseModel(model);
  const layoutErrors = validateLayoutModel(layoutModel);
  const errors = [...modelErrors, ...layoutErrors];

  if (errors.length > 0) {
    throw new Error(
      `Invalid zoneflow document:\\n- ${errors.join("\\n- ")}`
    );
  }

  return {
    kind: ZONEFLOW_DOCUMENT_KIND,
    formatVersion: ZONEFLOW_DOCUMENT_VERSION,
    exportedAt:
      typeof input.exportedAt === "string" ? input.exportedAt : new Date().toISOString(),
    model,
    layoutModel,
  };
}

export function parseZoneflowDocument(json: string): ZoneflowDocument {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown JSON parse error";
    throw new Error(`Failed to parse zoneflow document JSON: ${message}`);
  }

  return readZoneflowDocument(parsed);
}
