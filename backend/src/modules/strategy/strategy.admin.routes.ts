import { Router } from 'express';
import { prisma } from '../../db/prisma/client.js';
import { requireEditorialCapability } from './strategy.authorization.js';
import { strategyAdminService } from './strategy.admin.service.js';

export const strategyAdminRouter = Router();

strategyAdminRouter.get('/datasets', requireEditorialCapability('draft:read'), async (_req, res, next) => {
  try {
    res.status(200).json({ datasets: await strategyAdminService.listDatasets() });
  } catch (error) {
    next(error);
  }
});

strategyAdminRouter.post('/datasets', requireEditorialCapability('dataset:create'), async (req, res, next) => {
  try {
    res.status(201).json(await strategyAdminService.createDataset(req.body));
  } catch (error) {
    next(error);
  }
});

strategyAdminRouter.post('/datasets/:datasetId/versions', requireEditorialCapability('draft:write'), async (req, res, next) => {
  try {
    res.status(201).json(await strategyAdminService.createDraft(req.params.datasetId, req.body, req.session.userId!));
  } catch (error) {
    next(error);
  }
});

strategyAdminRouter.get('/versions/:versionId', requireEditorialCapability('draft:read'), async (req, res, next) => {
  try {
    res.status(200).json(await strategyAdminService.getVersion(req.params.versionId));
  } catch (error) {
    next(error);
  }
});

strategyAdminRouter.put('/versions/:versionId', requireEditorialCapability('draft:write'), async (req, res, next) => {
  try {
    res.status(200).json(await strategyAdminService.updateDraft(req.params.versionId, req.body));
  } catch (error) {
    next(error);
  }
});

strategyAdminRouter.post('/versions/:versionId/validate', requireEditorialCapability('draft:validate'), async (req, res, next) => {
  try {
    res.status(200).json(await strategyAdminService.validateVersion(req.params.versionId, req.session.userId!));
  } catch (error) {
    next(error);
  }
});

strategyAdminRouter.post('/versions/:versionId/publish', requireEditorialCapability('version:publish'), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.session.userId! }, select: { editorialRole: true } });
    const role = user?.editorialRole === 'ADMIN' ? 'ADMIN' : 'PUBLISHER';
    res.status(200).json(await strategyAdminService.publishVersion(req.params.versionId, req.body, req.session.userId!, role));
  } catch (error) {
    next(error);
  }
});

strategyAdminRouter.post('/versions/:versionId/retire', requireEditorialCapability('version:retire'), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.session.userId! }, select: { editorialRole: true } });
    const role = user?.editorialRole === 'ADMIN' ? 'ADMIN' : 'PUBLISHER';
    res.status(200).json(await strategyAdminService.retireVersion(req.params.versionId, req.body, req.session.userId!, role));
  } catch (error) {
    next(error);
  }
});

strategyAdminRouter.get('/datasets/:datasetId/history', requireEditorialCapability('history:read'), async (req, res, next) => {
  try {
    res.status(200).json({ history: await strategyAdminService.history(req.params.datasetId) });
  } catch (error) {
    next(error);
  }
});

strategyAdminRouter.get('/audit', requireEditorialCapability('audit:read'), async (req, res, next) => {
  try {
    const limit = Number(req.query.limit ?? 50);
    res.status(200).json({ entries: await strategyAdminService.audit(Number.isFinite(limit) ? limit : 50) });
  } catch (error) {
    next(error);
  }
});

strategyAdminRouter.patch('/users/:userId/role', requireEditorialCapability('role:write'), async (req, res, next) => {
  try {
    const user = await strategyAdminService.assignRole(req.params.userId, req.body, req.session.userId!);
    res.status(200).json({ id: user.id, role: user.editorialRole });
  } catch (error) {
    next(error);
  }
});
