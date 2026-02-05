// MongoDB Demo Database Initialization
// ====================================
// This script creates sample collections and documents for the DBackup demo.

// Switch to demo_app database
db = db.getSiblingDB('demo_app');

// Create user for the demo_app database
db.createUser({
    user: 'demouser',
    pwd: 'demopassword',
    roles: [{ role: 'readWrite', db: 'demo_app' }]
});

// ==========================================
// Sample IoT/Telemetry Schema
// ==========================================

// Devices collection
db.devices.insertMany([
    {
        deviceId: 'sensor-001',
        name: 'Temperature Sensor - Office',
        type: 'temperature',
        location: { building: 'HQ', floor: 1, room: 'Reception' },
        status: 'active',
        lastSeen: new Date(),
        metadata: { manufacturer: 'SensorCorp', model: 'TC-100', firmware: '2.3.1' }
    },
    {
        deviceId: 'sensor-002',
        name: 'Humidity Sensor - Server Room',
        type: 'humidity',
        location: { building: 'HQ', floor: -1, room: 'Data Center' },
        status: 'active',
        lastSeen: new Date(),
        metadata: { manufacturer: 'SensorCorp', model: 'HM-200', firmware: '1.8.0' }
    },
    {
        deviceId: 'sensor-003',
        name: 'Motion Sensor - Entrance',
        type: 'motion',
        location: { building: 'HQ', floor: 0, room: 'Main Entrance' },
        status: 'active',
        lastSeen: new Date(),
        metadata: { manufacturer: 'SecureTech', model: 'MT-50', firmware: '3.1.0' }
    },
    {
        deviceId: 'sensor-004',
        name: 'CO2 Sensor - Meeting Room',
        type: 'air_quality',
        location: { building: 'HQ', floor: 2, room: 'Conference Room A' },
        status: 'maintenance',
        lastSeen: new Date(Date.now() - 86400000), // 1 day ago
        metadata: { manufacturer: 'AirMonitor', model: 'AQ-300', firmware: '2.0.5' }
    },
    {
        deviceId: 'sensor-005',
        name: 'Temperature Sensor - Warehouse',
        type: 'temperature',
        location: { building: 'Warehouse', floor: 1, room: 'Storage A' },
        status: 'active',
        lastSeen: new Date(),
        metadata: { manufacturer: 'SensorCorp', model: 'TC-100', firmware: '2.3.1' }
    }
]);

// Create index on deviceId
db.devices.createIndex({ deviceId: 1 }, { unique: true });
db.devices.createIndex({ type: 1 });
db.devices.createIndex({ status: 1 });

// Readings collection (time-series data)
const now = Date.now();
const readings = [];

// Generate sample readings for the past 24 hours
for (let i = 0; i < 288; i++) { // Every 5 minutes
    const timestamp = new Date(now - (i * 5 * 60 * 1000));

    // Temperature sensor readings
    readings.push({
        deviceId: 'sensor-001',
        type: 'temperature',
        value: 21 + Math.random() * 4, // 21-25°C
        unit: 'celsius',
        timestamp: timestamp
    });

    readings.push({
        deviceId: 'sensor-005',
        type: 'temperature',
        value: 15 + Math.random() * 5, // 15-20°C (warehouse is cooler)
        unit: 'celsius',
        timestamp: timestamp
    });

    // Humidity readings
    readings.push({
        deviceId: 'sensor-002',
        type: 'humidity',
        value: 40 + Math.random() * 20, // 40-60%
        unit: 'percent',
        timestamp: timestamp
    });

    // Motion readings (sporadic)
    if (Math.random() > 0.7) {
        readings.push({
            deviceId: 'sensor-003',
            type: 'motion',
            value: 1,
            unit: 'boolean',
            timestamp: timestamp
        });
    }

    // Air quality readings
    if (i % 12 === 0) { // Every hour
        readings.push({
            deviceId: 'sensor-004',
            type: 'co2',
            value: 400 + Math.random() * 600, // 400-1000 ppm
            unit: 'ppm',
            timestamp: timestamp
        });
    }
}

db.readings.insertMany(readings);

// Create indexes for time-series queries
db.readings.createIndex({ deviceId: 1, timestamp: -1 });
db.readings.createIndex({ type: 1, timestamp: -1 });
db.readings.createIndex({ timestamp: -1 });

// Alerts collection
db.alerts.insertMany([
    {
        alertId: 'alert-001',
        deviceId: 'sensor-002',
        type: 'threshold_exceeded',
        severity: 'warning',
        message: 'Humidity exceeded 55% in Server Room',
        value: 57.3,
        threshold: 55,
        acknowledged: true,
        acknowledgedBy: 'admin@example.com',
        acknowledgedAt: new Date(now - 3600000),
        createdAt: new Date(now - 7200000)
    },
    {
        alertId: 'alert-002',
        deviceId: 'sensor-004',
        type: 'device_offline',
        severity: 'critical',
        message: 'CO2 Sensor in Meeting Room is offline',
        acknowledged: false,
        createdAt: new Date(now - 86400000)
    },
    {
        alertId: 'alert-003',
        deviceId: 'sensor-001',
        type: 'threshold_exceeded',
        severity: 'info',
        message: 'Temperature in Office reached 24.5°C',
        value: 24.5,
        threshold: 24,
        acknowledged: true,
        acknowledgedBy: 'admin@example.com',
        acknowledgedAt: new Date(now - 1800000),
        createdAt: new Date(now - 3600000)
    }
]);

db.alerts.createIndex({ alertId: 1 }, { unique: true });
db.alerts.createIndex({ severity: 1, acknowledged: 1 });
db.alerts.createIndex({ createdAt: -1 });

// Users collection (for the IoT dashboard)
db.users.insertMany([
    {
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        preferences: { theme: 'dark', notifications: true },
        createdAt: new Date(now - 30 * 24 * 3600000)
    },
    {
        email: 'operator@example.com',
        name: 'System Operator',
        role: 'operator',
        preferences: { theme: 'light', notifications: true },
        createdAt: new Date(now - 15 * 24 * 3600000)
    },
    {
        email: 'viewer@example.com',
        name: 'Dashboard Viewer',
        role: 'viewer',
        preferences: { theme: 'system', notifications: false },
        createdAt: new Date(now - 7 * 24 * 3600000)
    }
]);

db.users.createIndex({ email: 1 }, { unique: true });

print('Demo database initialized successfully!');
print('Collections created: devices, readings, alerts, users');
print('Total readings: ' + db.readings.countDocuments());
