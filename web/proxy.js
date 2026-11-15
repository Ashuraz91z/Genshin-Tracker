import { NextResponse } from 'next/server';
export function proxy(request) {
  const nonce=Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
  const development=process.env.NODE_ENV==='development';
  const csp=`default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development?" 'unsafe-eval'":''}; style-src 'self' ${development?"'unsafe-inline'":`'nonce-${nonce}'`}; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`;
  const headers=new Headers(request.headers);headers.set('x-nonce',nonce);headers.set('Content-Security-Policy',csp);
  const response=NextResponse.next({request:{headers}});response.headers.set('Content-Security-Policy',csp);return response;
}
export const config={matcher:['/((?!api|_next/static|_next/image|assets|health|favicon.ico).*)']};
