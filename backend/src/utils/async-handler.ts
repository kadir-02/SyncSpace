// import { RequestHandler } from "express";

// export const asyncHandler = (handler: RequestHandler): RequestHandler => {
//   return (req, res, next) => {
//     Promise.resolve(handler(req, res, next)).catch(next);
//   };
// };

import { Request, Response, NextFunction, RequestHandler } from "express";

export const asyncHandler = <
  P = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
>(
  handler: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction,
  ) => Promise<any>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};
