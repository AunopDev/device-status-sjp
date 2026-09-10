import { GoogleSheetsService } from '../google-sheets/google-sheets-service';
import { DeviceStatusService } from './device-status.service';

describe('DeviceStatusService mapping', () => {
  const originalToken = process.env.DEVICE_STATUS_BEARER_TOKEN;

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalToken === undefined)
      delete process.env.DEVICE_STATUS_BEARER_TOKEN;
    else process.env.DEVICE_STATUS_BEARER_TOKEN = originalToken;
  });

  it('maps an NVR to its Node and Project', async () => {
    process.env.DEVICE_STATUS_BEARER_TOKEN = 'test-token';
    const sheets = new GoogleSheetsService();
    jest.spyOn(sheets, 'findAll').mockImplementation(async (sheetName) => {
      if (sheetName === 'device')
        return [{ uuid: 'nvr-1', name: 'NVR-01', index: 'NVR', ref: 'node-1' }];
      if (sheetName === 'node')
        return [{ uuid: 'NODE-1', name: 'เสาแยกตลาด', projcet: 'ThaKhlong' }];
      if (sheetName === 'decoder')
        return [{ uuid: 'decoder-1', index: 'NVR', name: 'เครื่องบันทึกภาพ' }];
      return [{ uuid: 'project-1', name: 'thakhlong', region: 'กลาง', province: 'ปทุมธานี' }];
    });
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ online: ['nvr-1'], offline: [] })),
      );
    const service = new DeviceStatusService(sheets);

    service.onModuleInit();
    await expect(service.getDevices()).resolves.toEqual([
      {
        uuid: 'nvr-1',
        name: 'NVR-01',
        index: 'NVR',
        ref: 'node-1',
        status: 'online',
        node_name: 'เสาแยกตลาด',
        node_uuid: 'NODE-1',
        project_name: 'thakhlong',
        project_uuid: 'project-1',
        project_region: 'กลาง',
        project_province: 'ปทุมธานี',
        decoder_name: 'เครื่องบันทึกภาพ',
      },
    ]);
    service.onModuleDestroy();
  });
});
