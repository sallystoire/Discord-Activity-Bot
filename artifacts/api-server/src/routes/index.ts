import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tokenRouter from "./token";
import gameRouter from "./game";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tokenRouter);
router.use("/game", gameRouter);

export default router;
