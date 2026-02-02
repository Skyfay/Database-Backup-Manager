import { describe, it, expect } from 'vitest';
import { MySQLSchema, PostgresSchema, MongoDBSchema, LocalStorageSchema, RedisSchema } from '@/lib/adapters/definitions';

describe('Adapter Configuration Validation (Zod)', () => {

    describe('MySQL Schema', () => {
        it('should accept valid configuration', () => {
            const valid = {
                host: '127.0.0.1',
                port: 3306,
                user: 'admin',
                password: 'password',
                database: 'mydb',
                disableSsl: false
            };
            const result = MySQLSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('should reject missing required fields', () => {
            const invalid = {
                host: '127.0.0.1',
                // missing user
                port: 3306
            };
            const result = MySQLSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        it('should coerce string ports to numbers', () => {
            const validWithStrPort = {
                host: 'localhost',
                port: "3306", // string
                user: 'root',
            };
            const result = MySQLSchema.safeParse(validWithStrPort);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.port).toBe(3306);
            }
        });

        // Note: Zod "coerce.number()" creates a number, but doesn't inherently check constraints unless .min()/.max() are added.
        // It might accept negative numbers if the schema definition doesn't use .int().nonnegative().
        // Let's check what happens with garbage.
        it('should reject non-numeric ports', () => {
             const invalid = {
                host: 'localhost',
                port: "abc",
                user: 'root',
            };
            const result = MySQLSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });
    });

    describe('Postgres Schema', () => {
        it('should accept valid configuration', () => {
            const valid = {
                host: 'postgres-db',
                port: 5432,
                user: 'pgadmin',
                database: 'pgdb'
            };
            const result = PostgresSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('should default empty database string', () => {
             const minimal = {
                host: 'localhost',
                user: 'pgadmin',
                // no database provided
            };
            const result = PostgresSchema.safeParse(minimal);
            expect(result.success).toBe(true);
            if(result.success) {
                expect(result.data.database).toBe("");
            }
        });
    });

    describe('MongoDB Schema', () => {
        it('should accept valid configuration', () => {
            const valid = {
                host: 'mongo',
                port: 27017,
                user: 'root',
                authenticationDatabase: 'admin'
            };
            const result = MongoDBSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('should accept URI override', () => {
            const uriConfig = {
                uri: 'mongodb://user:pass@host:27017/db'
            };
            // Schema has defaults for host/port so they might be filled in automatically
            const result = MongoDBSchema.safeParse(uriConfig);
            expect(result.success).toBe(true);
            if(result.success) {
                expect(result.data.uri).toBeDefined();
            }
        });
    });

    describe('LocalStorage Schema', () => {
        it('should validate path requirements if present', () => {
            const valid = {
                basePath: '/var/backups'
            };
            const result = LocalStorageSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('should use default basePath if missing', () => {
             const invalid = {};
             const result = LocalStorageSchema.safeParse(invalid);
             expect(result.success).toBe(true);
             if (result.success) {
                 expect(result.data.basePath).toBe('/backups');
             }
        });
    });

    describe('Redis Schema', () => {
        it('should accept valid standalone configuration', () => {
            const valid = {
                host: '127.0.0.1',
                port: 6379,
                password: 'secretpassword',
                database: 0
            };
            const result = RedisSchema.safeParse(valid);
            expect(result.success).toBe(true);
        });

        it('should default to standalone mode', () => {
            const minimal = {
                host: 'localhost'
            };
            const result = RedisSchema.safeParse(minimal);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.mode).toBe('standalone');
            }
        });

        it('should default port to 6379', () => {
            const minimal = {
                host: 'localhost'
            };
            const result = RedisSchema.safeParse(minimal);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.port).toBe(6379);
            }
        });

        it('should reject invalid database number (> 15)', () => {
            const invalid = {
                host: 'localhost',
                database: 20
            };
            const result = RedisSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        it('should reject negative database number', () => {
            const invalid = {
                host: 'localhost',
                database: -1
            };
            const result = RedisSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        it('should accept valid database numbers (0-15)', () => {
            for (let i = 0; i <= 15; i++) {
                const config = { host: 'localhost', database: i };
                const result = RedisSchema.safeParse(config);
                expect(result.success).toBe(true);
            }
        });

        it('should accept sentinel mode with master name', () => {
            const sentinelConfig = {
                mode: 'sentinel' as const,
                host: 'sentinel-1',
                port: 26379,
                sentinelMasterName: 'mymaster',
                sentinelNodes: 'sentinel-1:26379,sentinel-2:26379'
            };
            const result = RedisSchema.safeParse(sentinelConfig);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.mode).toBe('sentinel');
            }
        });

        it('should coerce string port to number', () => {
            const config = {
                host: 'localhost',
                port: '6379'
            };
            const result = RedisSchema.safeParse(config);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.port).toBe(6379);
            }
        });

        it('should accept TLS configuration', () => {
            const tlsConfig = {
                host: 'redis.example.com',
                port: 6380,
                tls: true,
                password: 'secret'
            };
            const result = RedisSchema.safeParse(tlsConfig);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.tls).toBe(true);
            }
        });

        it('should accept optional username (Redis 6+ ACL)', () => {
            const aclConfig = {
                host: 'localhost',
                username: 'myuser',
                password: 'mypassword'
            };
            const result = RedisSchema.safeParse(aclConfig);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.username).toBe('myuser');
            }
        });
    });
});
