# Device status refresh

`GET /device-status/devices` remains authenticated and returns the existing array
of sheet records with `status` mapped by `uuid` to `online`, `offline`, or `ไม่ระบุ`.

The backend polls the status provider on module initialization and every 30 seconds
(`DEVICE_STATUS_POLL_INTERVAL_MS`). Each backend instance keeps one in-memory
snapshot shared by all requests. Provider requests time out after 10 seconds;
overlapping polls are skipped. Shutdown clears the timer and aborts the request.
`DEVICE_STATUS_BEARER_TOKEN` is required as before.

If the latest poll fails, the endpoint returns HTTP 503 instead of serving old
statuses. The next scheduled poll retries automatically. Google Sheets device
records are still read per endpoint request; they are not cached.

The Dashboard requests devices every 30 seconds while mounted, including when
another dashboard tab is selected. It skips concurrent device requests, times out
after 25 seconds, and cancels polling and the request on navigation away.
Successful background refreshes do not replace the table with a loading screen.
The two polling schedules are independent: a provider change may take roughly
60 seconds plus request latency to appear on screen.

No new packages, Zod, or Cloudflare Tunnel configuration are included.
