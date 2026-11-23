import { NextResponse } from 'next/server';
export function proxy(request) {
  const nonce=Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
  const development=process.env.NODE_ENV==='development';
  const csp=`default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${development?" 'unsafe-eval'":''}; style-src 'self' ${development?"'unsafe-inline'":`'nonce-${nonce}'`}; img-src 'self' data: https://*.stripe.com; font-src 'self'; worker-src 'self'; connect-src 'self'${development?' http://localhost:4747':''} https://api.stripe.com https://checkout.stripe.com https://*.link.com; frame-src https://js.stripe.com https://*.js.stripe.com https://checkout.stripe.com https://hooks.stripe.com https://*.link.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`;
  // /en/... is served by the same routes: strip the prefix and tell the page which language to render.
  const english=/^\/en(\/|$)/.test(request.nextUrl.pathname);
  const url=request.nextUrl.clone();if(english)url.pathname=url.pathname.replace(/^\/en/,'')||'/';
  const headers=new Headers(request.headers);headers.set('x-nonce',nonce);headers.set('x-locale',english||request.headers.get('x-locale')==='en'?'en':'fr');headers.set('Content-Security-Policy',csp);
  const response=english?NextResponse.rewrite(url,{request:{headers}}):NextResponse.next({request:{headers}});response.headers.set('Content-Security-Policy',csp);return response;
}
export const config={matcher:['/((?!api|_next/static|_next/image|assets|health|favicon.ico).*)']};
