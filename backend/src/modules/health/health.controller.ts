import { Request, Response } from 'express';
import { getDatabaseStatus } from '../../config/database';
import { sendSuccess } from '../../utils/apiResponse';

export function getHealthStatus(_req: Request, res: Response): Response {
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: getDatabaseStatus(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  };

  return sendSuccess(res, healthData, 'Kanhaiya General Store API is healthy');
}
