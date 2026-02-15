/// <reference types="vite/client" />

// Astro virtual module declarations
declare module "astro:middleware" {
  export function defineMiddleware(
    handler: (context: any, next: () => Promise<Response>) => Promise<Response>
  ): (context: any, next: () => Promise<Response>) => Promise<Response>;
}
