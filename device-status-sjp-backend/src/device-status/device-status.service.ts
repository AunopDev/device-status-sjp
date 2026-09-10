import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GoogleSheetsService } from '../google-sheets/google-sheets-service';

const DEVICE_STATUS_URL = 'https://status.sjp-gis.com/v2/device/status';
const DEVICE_STATUS_ONLINE = 'online';
const DEVICE_STATUS_OFFLINE = 'offline';
export const DEVICE_STATUS_POLL_INTERVAL_MS = 30_000;
const DEVICE_STATUS_REQUEST_TIMEOUT_MS = 10_000;
const DEVICE_STATUS_UNKNOWN = 'ไม่ระบุ';
const NODE_REFERENCE_FIELD = 'ref';
const NODE_NAME_FIELD = 'name';
const NODE_PROJECT_FIELD = 'project';
const NODE_LEGACY_PROJECT_FIELD = 'projcet';
const PROJECT_UUID_FIELD = 'uuid';
const PROJECT_NAME_FIELD = 'name';
const PROJECT_REGION_FIELD = 'region';
const PROJECT_PROVINCE_FIELD = 'province';
const DEVICE_NODE_NAME_FIELD = 'node_name';
const DEVICE_NODE_UUID_FIELD = 'node_uuid';
const DEVICE_PROJECT_NAME_FIELD = 'project_name';
const DEVICE_PROJECT_UUID_FIELD = 'project_uuid';
const DEVICE_PROJECT_REGION_FIELD = 'project_region';
const DEVICE_PROJECT_PROVINCE_FIELD = 'project_province';
const DEVICE_DECODER_NAME_FIELD = 'decoder_name';
const DECODER_REFERENCE_FIELDS = ['uuid', 'ref', 'index', 'code'] as const;
const DEVICE_DECODER_KEY_FIELDS = ['decoder_ref', 'decoder_uuid', 'decoder', 'index'] as const;

type DeviceRecord = Record<string, unknown> & { uuid: string };
type NodeRecord = Record<string, unknown> & { uuid: string };
type ProjectRecord = Record<string, unknown> & { uuid: string };
type DecoderRecord = Record<string, unknown> & { uuid: string };
type DeviceStatusResponse = { online: string[]; offline: string[] };

@Injectable()
export class DeviceStatusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeviceStatusService.name);
  private statusSnapshot: DeviceStatusResponse | undefined;
  private refreshInFlight: Promise<void> | undefined;
  private pollTimer: ReturnType<typeof setInterval> | undefined;
  private requestController: AbortController | undefined;

  constructor(private readonly googleSheetsService: GoogleSheetsService) {}

  onModuleInit(): void {
    void this.refreshStatuses();
    this.pollTimer = setInterval(() => {
      void this.refreshStatuses();
    }, DEVICE_STATUS_POLL_INTERVAL_MS);
    this.pollTimer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.pollTimer);
    this.requestController?.abort();
  }

  private refreshStatuses(): Promise<void> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.fetchDeviceStatuses()
      .then((statuses) => {
        this.statusSnapshot = statuses;
      })
      .catch((error: unknown) => {
        this.statusSnapshot = undefined;
        this.logger.error(
          'Failed to refresh device statuses',
          error instanceof Error ? error.message : 'Unknown error',
        );
      })
      .finally(() => {
        this.refreshInFlight = undefined;
      });
    return this.refreshInFlight;
  }

  async getDevices(): Promise<DeviceRecord[]> {
    const decodersPromise = this.googleSheetsService.findAll('decoder').catch((error: unknown) => {
      this.logger.warn(
        'Decoder data is unavailable; returning devices without decoder details',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return [];
    });
    const [devices, nodes, projects, decoders] = await Promise.all([
      this.googleSheetsService.findAll('device'),
      this.googleSheetsService.findAll('node'),
      this.googleSheetsService.findAll('project'),
      decodersPromise,
    ]);
    const deviceRecords = devices.filter(isDeviceRecord);
    const nodeByUuid = createRecordMap(
      nodes.filter(isNodeRecord),
      (node) => node.uuid,
    );
    const projectByReference = createProjectMap(
      projects.filter(isProjectRecord),
    );
    const decoderRecords = decoders.reduce<DecoderRecord[]>((records, value) => {
      if (isDecoderRecord(value)) records.push(value);
      return records;
    }, []);
    const decoderByReference = createDecoderMap(decoderRecords);
    await this.refreshInFlight;
    const statusResponse = this.statusSnapshot;
    if (!statusResponse)
      throw new ServiceUnavailableException('ไม่สามารถโหลดสถานะอุปกรณ์ได้');
    const statusByUuid = new Map<string, string>();

    for (const uuid of statusResponse.online)
      statusByUuid.set(uuid, DEVICE_STATUS_ONLINE);
    for (const uuid of statusResponse.offline)
      statusByUuid.set(uuid, DEVICE_STATUS_OFFLINE);

    return deviceRecords.map((device) => {
      const node = nodeByUuid.get(
        normalizeReference(getRecordString(device, NODE_REFERENCE_FIELD)),
      );
      const projectReference = getFirstRecordString(node, [
        NODE_PROJECT_FIELD,
        NODE_LEGACY_PROJECT_FIELD,
      ]);
      const project = projectByReference.get(
        normalizeReference(projectReference),
      );
      const decoderName = findDecoderName(device, decoderByReference);

      return {
        ...device,
        status: statusByUuid.get(device.uuid) ?? DEVICE_STATUS_UNKNOWN,
        [DEVICE_NODE_NAME_FIELD]:
          getRecordString(node, NODE_NAME_FIELD) ?? DEVICE_STATUS_UNKNOWN,
        [DEVICE_NODE_UUID_FIELD]: node?.uuid ?? DEVICE_STATUS_UNKNOWN,
        [DEVICE_PROJECT_NAME_FIELD]:
          getRecordString(project, PROJECT_NAME_FIELD) ??
          projectReference ??
          DEVICE_STATUS_UNKNOWN,
        [DEVICE_PROJECT_UUID_FIELD]: project?.uuid ?? DEVICE_STATUS_UNKNOWN,
        [DEVICE_PROJECT_REGION_FIELD]:
          getRecordString(project, PROJECT_REGION_FIELD) ?? DEVICE_STATUS_UNKNOWN,
        [DEVICE_PROJECT_PROVINCE_FIELD]:
          getRecordString(project, PROJECT_PROVINCE_FIELD) ?? DEVICE_STATUS_UNKNOWN,
        ...(decoderName ? { [DEVICE_DECODER_NAME_FIELD]: decoderName } : {}),
      };
    });
  }

  // async getProjects(): Promise<ProjectRecord[]> {
  //   const projects = await this.googleSheetsService.findAll('project');
  //   return projects.filter(isProjectRecord);
  // }

  private async fetchDeviceStatuses(): Promise<DeviceStatusResponse> {
    const controller = new AbortController();
    this.requestController = controller;
    const timeout = setTimeout(
      () => controller.abort(),
      DEVICE_STATUS_REQUEST_TIMEOUT_MS,
    );
    try {
      const bearerToken = process.env.DEVICE_STATUS_BEARER_TOKEN?.trim();
      if (!bearerToken)
        throw new Error('DEVICE_STATUS_BEARER_TOKEN is not configured');

      const response = await fetch(DEVICE_STATUS_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${bearerToken}` },
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(`Device status API returned ${response.status}`);

      const payload: unknown = await response.json();
      if (!isDeviceStatusResponse(payload))
        throw new Error('Device status API returned an invalid response');
      return payload;
    } finally {
      clearTimeout(timeout);
      this.requestController = undefined;
    }
  }
}

function isDeviceRecord(value: unknown): value is DeviceRecord {
  return isRecordWithUuid(value);
}

function isNodeRecord(value: unknown): value is NodeRecord {
  return isRecordWithUuid(value);
}

function isProjectRecord(value: unknown): value is ProjectRecord {
  return isRecordWithUuid(value);
}

function isDecoderRecord(value: unknown): value is DecoderRecord {
  return isRecordWithUuid(value);
}

function isRecordWithUuid(
  value: unknown,
): value is Record<string, unknown> & { uuid: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const record = value as Record<string, unknown>;
  return typeof record.uuid === 'string' && record.uuid.trim().length > 0;
}

function createRecordMap<T extends { uuid: string }>(
  records: readonly T[],
  getReference: (record: T) => string,
): Map<string, T> {
  return new Map(
    records.map((record) => [normalizeReference(getReference(record)), record]),
  );
}

function createProjectMap(
  projects: readonly ProjectRecord[],
): Map<string, ProjectRecord> {
  const projectByReference = new Map<string, ProjectRecord>();
  for (const project of projects) {
    projectByReference.set(normalizeReference(project.uuid), project);
    const projectName = getRecordString(project, PROJECT_NAME_FIELD);
    if (projectName)
      projectByReference.set(normalizeReference(projectName), project);
  }
  return projectByReference;
}

function createDecoderMap(
  decoders: readonly DecoderRecord[],
): Map<string, DecoderRecord> {
  const decoderByReference = new Map<string, DecoderRecord>();
  for (const decoder of decoders) {
    for (const field of DECODER_REFERENCE_FIELDS) {
      const reference = getRecordString(decoder, field);
      if (reference) decoderByReference.set(normalizeReference(reference), decoder);
    }
  }
  return decoderByReference;
}

function findDecoderName(
  device: DeviceRecord,
  decoderByReference: ReadonlyMap<string, DecoderRecord>,
): string | undefined {
  for (const field of DEVICE_DECODER_KEY_FIELDS) {
    const reference = getRecordString(device, field);
    const decoder = decoderByReference.get(normalizeReference(reference));
    const decoderName = getFirstRecordString(decoder, ['name', 'label', 'title']);
    if (decoderName) return decoderName;
  }
  return undefined;
}

function getRecordString(
  record: Record<string, unknown> | undefined,
  field: string,
): string | undefined {
  const value = record?.[field];
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function getFirstRecordString(
  record: Record<string, unknown> | undefined,
  fields: readonly string[],
): string | undefined {
  for (const field of fields) {
    const value = getRecordString(record, field);
    if (value) return value;
  }
  return undefined;
}

function normalizeReference(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function isDeviceStatusResponse(value: unknown): value is DeviceStatusResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const record = value as Record<string, unknown>;
  return isStringArray(record.online) && isStringArray(record.offline);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}
