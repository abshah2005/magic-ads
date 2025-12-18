import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => {
        // const uri = cfg.get<string>('MONGO_URI')!;
        const nodeEnv = cfg.get<string>('NODE_ENV');
        const uri = nodeEnv === 'prod' 
          ? cfg.get<string>('MONGO_URI')!
          : cfg.get<string>('MONGO_LOCAL_URI')!;
          
        return {
          uri,
          dbName: cfg.get<string>('MONGO_DB_NAME') || undefined,
          retryAttempts: Number(cfg.get('MONGO_RETRY_ATTEMPTS') || 5),
          retryDelay: Number(cfg.get('MONGO_RETRY_DELAY_MS') || 3000),
          maxPoolSize: Number(cfg.get('MONGO_MAX_POOL') || 10),
          serverSelectionTimeoutMS: Number(cfg.get('MONGO_SERVER_SELECTION_TIMEOUT_MS') || 5000),
          socketTimeoutMS: Number(cfg.get('MONGO_SOCKET_TIMEOUT_MS') || 45000),
          autoCreate: false,
          connectionFactory: (conn) => {
            conn.on('connected', () => console.log('MongoDB connected'));
            conn.on('disconnected', () => console.warn('MongoDB disconnected'));
            conn.on('error', (err) => console.error('MongoDB error', err));
            return conn;
          },
        } as any;
      },
      inject: [ConfigService],
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}