import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { SettingsService } from '../settings/settings.service';
import { sendSuccess } from '../../utils/apiResponse';

export async function getOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const { range, startDate, endDate } = req.query as { range?: string; startDate?: string; endDate?: string };
    const data = await AnalyticsService.getOverview(range, startDate, endDate);
    return sendSuccess(res, data, 'Analytics overview retrieved successfully');
  } catch (err) {
    next(err);
  }
}

export async function getSalesAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const { range, startDate, endDate } = req.query as { range?: string; startDate?: string; endDate?: string };
    const data = await AnalyticsService.getSalesAnalytics(range, startDate, endDate);
    return sendSuccess(res, data, 'Sales analytics retrieved successfully');
  } catch (err) {
    next(err);
  }
}

export async function getProductReports(req: Request, res: Response, next: NextFunction) {
  try {
    const { range, startDate, endDate, limit, page } = req.query as {
      range?: string;
      startDate?: string;
      endDate?: string;
      limit?: string;
      page?: string;
    };
    const data = await AnalyticsService.getProductReports(
      range,
      startDate,
      endDate,
      limit ? parseInt(limit, 10) : 20,
      page ? parseInt(page, 10) : 1
    );
    return sendSuccess(res, data, 'Product performance report retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getInventoryReports(req: Request, res: Response, next: NextFunction) {
  try {
    const { range, startDate, endDate } = req.query as { range?: string; startDate?: string; endDate?: string };
    const data = await AnalyticsService.getInventoryReports(range, startDate, endDate);
    return sendSuccess(res, data, 'Inventory report retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getOrderReports(req: Request, res: Response, next: NextFunction) {
  try {
    const { range, startDate, endDate } = req.query as { range?: string; startDate?: string; endDate?: string };
    const data = await AnalyticsService.getOrderReports(range, startDate, endDate);
    return sendSuccess(res, data, 'Orders report retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, page, limit } = req.query as { search?: string; page?: string; limit?: string };
    const data = await AnalyticsService.getCustomers(
      search,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20
    );
    return sendSuccess(res, data, 'Customer list retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getCustomerDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = await AnalyticsService.getCustomerDetails(id);
    return sendSuccess(res, data, 'Customer profile retrieved');
  } catch (err) {
    next(err);
  }
}

export async function exportReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { reportType } = req.params;
    const { range, startDate, endDate } = req.query as { range?: string; startDate?: string; endDate?: string };
    const { filename, csv } = await AnalyticsService.exportReportCsv(reportType, range, startDate, endDate);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}

export async function getStoreSettingsAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await SettingsService.getSettings();
    return sendSuccess(res, settings, 'Full store settings retrieved');
  } catch (err) {
    next(err);
  }
}

export async function updateStoreSettingsAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const updated = await SettingsService.updateSettings(req.body);
    return sendSuccess(res, updated, 'Store settings updated successfully');
  } catch (err) {
    next(err);
  }
}
