// This file extends Next.js types to fix issues with dynamic route parameters

import { NextRequest } from 'next/server';

declare global {
  type RouteHandlerParams<T extends Record<string, string>> = {
    params: T;
  };
  
  type GetRouteHandlerFn<T extends Record<string, string>> = (
    req: NextRequest,
    context: RouteHandlerParams<T>
  ) => Promise<Response> | Response;
  
  type PostRouteHandlerFn<T extends Record<string, string>> = (
    req: NextRequest,
    context: RouteHandlerParams<T>
  ) => Promise<Response> | Response;
  
  type PutRouteHandlerFn<T extends Record<string, string>> = (
    req: NextRequest,
    context: RouteHandlerParams<T>
  ) => Promise<Response> | Response;
  
  type DeleteRouteHandlerFn<T extends Record<string, string>> = (
    req: NextRequest,
    context: RouteHandlerParams<T>
  ) => Promise<Response> | Response;
}

export {};
