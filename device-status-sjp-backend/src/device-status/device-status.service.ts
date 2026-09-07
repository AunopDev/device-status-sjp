import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GoogleSheetsService } from '../google-sheets/google-sheets-service';

const DEVICE_STATUS_URL = 'https://status.sjp-gis.com/v2/device/status';
const DEVICE_STATUS_ONLINE = 'online';
const DEVICE_STATUS_OFFLINE = 'offline';

type DeviceRecord = Record<string, unknown> & { uuid: string };
type DeviceStatusResponse = { online: string[]; offline: string[] };

@Injectable()
export class DeviceStatusService {
  constructor(private readonly googleSheetsService: GoogleSheetsService) {}

  async getDevices(): Promise<DeviceRecord[]> {
    const devices = await this.googleSheetsService.findAll('device');
    const deviceRecords = devices.filter(isDeviceRecord);
    const statusResponse = await this.fetchDeviceStatuses();
    const statusByUuid = new Map<string, string>();

    for (const uuid of statusResponse.online)
      statusByUuid.set(uuid, DEVICE_STATUS_ONLINE);
    for (const uuid of statusResponse.offline)
      statusByUuid.set(uuid, DEVICE_STATUS_OFFLINE);

    return deviceRecords.map((device) => ({
      ...device,
      status: statusByUuid.get(device.uuid) ?? 'ไม่ระบุ',
    }));
  }

  private async fetchDeviceStatuses(): Promise<DeviceStatusResponse> {
    try {
      const bearerToken = process.env.DEVICE_STATUS_BEARER_TOKEN?.trim();
      if (!bearerToken)
        throw new Error('DEVICE_STATUS_BEARER_TOKEN is not configured');

      const response = await fetch(DEVICE_STATUS_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${bearerToken}` },
      });
      if (!response.ok)
        throw new Error(`Device status API returned ${response.status}`);

      const payload: unknown = await response.json();
      if (!isDeviceStatusResponse(payload))
        throw new Error('Device status API returned an invalid response');
      return payload;
    } catch (error: unknown) {
      console.error('Failed to load device statuses:', error);
      throw new ServiceUnavailableException('ไม่สามารถโหลดสถานะอุปกรณ์ได้');
    }
  }
}

function isDeviceRecord(value: unknown): value is DeviceRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const record = value as Record<string, unknown>;
  return typeof record.uuid === 'string' && record.uuid.trim().length > 0;
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
