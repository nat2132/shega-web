import type { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message: string): ApiError => new ApiError(400, message);
export const unauthorized = (message = "No active account found with the given credentials"): ApiError =>
  new ApiError(401, message);
export const forbidden = (message = "Admin access required."): ApiError => new ApiError(403, message);
export const notFound = (message = "Not found."): ApiError => new ApiError(404, message);
export const conflict = (message: string): ApiError => new ApiError(409, message);
export const tooMany = (message: string): ApiError => new ApiError(429, message);

export const OK = (data: unknown) => ({ data });
export const NO_CONTENT = undefined;

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function wrap(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}