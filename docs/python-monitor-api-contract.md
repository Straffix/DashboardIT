# Monitor API Contract

Ta notatka jest historyczna i opisuje przykladowy shape danych dla modulu monitor.
Nie narzuca finalnego kontraktu ani technologii backendu.
Frontend korzysta z niego przez:

- [apps/web/src/features/monitor/api-contract.ts](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/apps/web/src/features/monitor/api-contract.ts:1>)
- [apps/web/src/features/monitor/storage.api.ts](</C:/Users/arkadiusz.lisiecki/OneDrive - Rossmann SDP/Pulpit/DashboardIT/apps/web/src/features/monitor/storage.api.ts:1>)

## Endpointy

### `GET /monitor/devices`

Response:

```json
{
  "items": [
    {
      "id": "monitor-1",
      "name": "REKRUTACJA746",
      "ru": "746",
      "serialNumber": "PF928402",
      "deviceType": "old",
      "domainExpiryDate": "2026-07-09",
      "lastExtendedOn": "",
      "createdAt": "2026-06-01T09:00:00.000Z",
      "updatedAt": "2026-06-01T09:00:00.000Z"
    }
  ]
}
```

### `POST /monitor/devices`

Request:

```json
{
  "name": "REKRUTACJA746",
  "ru": "746",
  "serialNumber": "PF928402",
  "deviceType": "old",
  "domainExpiryDate": "2026-07-09"
}
```

Response:

```json
{
  "item": {
    "id": "monitor-1",
    "name": "REKRUTACJA746",
    "ru": "746",
    "serialNumber": "PF928402",
    "deviceType": "old",
    "domainExpiryDate": "2026-07-09",
    "lastExtendedOn": "",
    "createdAt": "2026-06-01T09:00:00.000Z",
    "updatedAt": "2026-06-01T09:00:00.000Z"
  }
}
```

### `PATCH /monitor/devices/{deviceId}`

Request body taki sam jak przy `POST`.

Response:

```json
{
  "item": {
    "id": "monitor-1",
    "name": "REKRUTACJA746",
    "ru": "746",
    "serialNumber": "PF928402",
    "deviceType": "old",
    "domainExpiryDate": "2026-08-15",
    "lastExtendedOn": "2026-06-30",
    "createdAt": "2026-06-01T09:00:00.000Z",
    "updatedAt": "2026-06-30T11:00:00.000Z"
  }
}
```

### `POST /monitor/devices/{deviceId}/extend`

Response:

```json
{
  "item": {
    "id": "monitor-1",
    "name": "REKRUTACJA746",
    "ru": "746",
    "serialNumber": "PF928402",
    "deviceType": "old",
    "domainExpiryDate": "2026-08-29",
    "lastExtendedOn": "2026-06-30",
    "createdAt": "2026-06-01T09:00:00.000Z",
    "updatedAt": "2026-06-30T11:00:00.000Z"
  }
}
```

### `DELETE /monitor/devices/{deviceId}`

Response:

```json
{
  "id": "monitor-1",
  "success": true
}
```

## Uwagi

- `serialNumber` jest zawsze znormalizowany: uppercase, bez myslnikow.
- `ru` jest stringiem z samymi cyframi.
- `deviceType` to tylko `new` albo `old`.
- dla `deviceType = "new"` pole `domainExpiryDate` powinno byc `null`
- daty frontend wysyla i czyta jako ISO date `YYYY-MM-DD`
- timestampy auditowe jako ISO datetime
