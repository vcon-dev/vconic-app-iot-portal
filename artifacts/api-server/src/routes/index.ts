import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import devicesRouter from "./devices";
import vconsRouter from "./vcons";
import ingestRouter from "./ingest";
import gatewayRouter from "./gateway";
import rulesRouter from "./rules";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(devicesRouter);
router.use(vconsRouter);
router.use(ingestRouter);
router.use(gatewayRouter);
router.use(rulesRouter);
router.use(dashboardRouter);
router.use(adminRouter);

export default router;
