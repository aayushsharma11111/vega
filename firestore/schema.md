# Firestore Schema - Rapid Crisis Response

### Collection: `alerts`
| Field | Type | Description |
| :--- | :--- | :--- |
| **room** | string | Hotel room number (e.g., "102") |
| **category** | string | Emergency type (Fire, Medical, etc.) |
| **status** | string | `active`, `resolved`, or `dismissed` |
| **timestamp** | timestamp | When the alert was created |
| **deleteAt** | timestamp | TTL field (Auto-deletes after 24h) |
| **severity** | string | `low`, `medium`, `high`, `critical` |
| **aiSummary** | string | Gemini generated alert summary |