import { Queue } from 'bullmq'
import IORedis from 'ioredis'

export const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379')

export const renderQueue = new Queue('render', { connection: redis })
